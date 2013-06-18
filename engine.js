/* global Crafty Box2D */
function defined (val, def) {
  return (val !== undefined) ? val : def
}

//shortcuts for Box2d 'modules' - pretend these are 'require' statements
var b2Vec2 = Box2D.Common.Math.b2Vec2
  , b2AABB = Box2D.Collision.b2AABB
  , b2BodyDef = Box2D.Dynamics.b2BodyDef
  , b2Body = Box2D.Dynamics.b2Body
  , b2FixtureDef = Box2D.Dynamics.b2FixtureDef
  , b2Fixture = Box2D.Dynamics.b2Fixture
  , b2World = Box2D.Dynamics.b2World
  , b2MassData = Box2D.Collision.Shapes.b2MassData
  , b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
  , b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
  , b2DebugDraw = Box2D.Dynamics.b2DebugDraw
  , b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef

var fixDef = new b2FixtureDef() //reusable
  , bodyDef = new b2BodyDef()   //reusable

//Box2D extensions
var b2Ex = (
  { bodyList2Array: function (firstBody) {
      var rv = []
      b2Ex._bodyList2Array(firstBody,rv)
      return rv
    }
  , _bodyList2Array: function (body, array) {
      if (body != undefined) {
        b2Ex._bodyList2Array(body.GetNext(), array)
        array.push(body)
      }
    }
  , createRect: function (world, config) {
      config = config || {}
      var x = defined(config.x, 0)
        , y = defined(config.y, 0)
        , w = defined(config.w, 1)
        , h = defined(config.h, 1)
      bodyDef.type = defined(config.bodyType, b2Body.b2_dynamicBody)
      fixDef.shape = new b2PolygonShape()
      fixDef.shape.SetAsBox(w/2, h/2)
      bodyDef.position.x = x+w/2
      bodyDef.position.y = y+h/2
      var body = world.CreateBody(bodyDef)
      body.CreateFixture(fixDef)
      return body
    }
  , createCircle: function (world, config) {
      config = config || {}
      var x = defined(config.x, 0)
        , y = defined(config.y, 0)
        , r = defined(config.r, 1)
      bodyDef.type = defined(config.bodyType, b2Body.b2_dynamicBody)
      fixDef.shape = new b2CircleShape(r)
      bodyDef.position.x = x
      bodyDef.position.y = y
      var body = world.CreateBody(bodyDef)
      body.CreateFixture(fixDef)
      return body
    }
  }
)

var Engine = function (config) {
  config = config || {}
  var DISPLAY_DIV = this.DISPLAY_DIV = config.displayDiv || 'display'
    , DISPLAY_WIDTH = this.DISPLAY_WIDTH = config.displayWidth || 600
    , DISPLAY_HEIGHT = this.DISPLAY_HEIGHT = config.displayHeight || 400
    , PIXEL_SCALE = this.PIXEL_SCALE = config.pixelScale || 30
    , G_FRAME_RATE = this.G_FRAME_RATE = config.gFrameRate || 20
    , P_FRAME_RATE = this.P_FRAME_RATE = config.pFrameRate || 30
    , GRAVITY = this.GRAVITY = defined(config.gravity, 10)
    , DEBUG = this.DEBUG = config.debug ? true : false
    , things = this.things = []
    , joints = this.joints = []
    , world = new b2World(new b2Vec2(0, GRAVITY),true)
    , display
    , engine = this

  this.ready = function (ready) {
    window.onload = function () {
      fixDef.density = 1.0
      fixDef.friction = 0.5
      fixDef.restitution = 0.2

      //initialize graphics
      Crafty.init(DISPLAY_WIDTH ,DISPLAY_HEIGHT)

      //setup debug draw
      if (DEBUG) {
        var debugDraw = new b2DebugDraw()
        debugDraw.SetSprite(document.getElementById("debugCanvas")
                                    .getContext("2d"))
        debugDraw.SetDrawScale(30.0)
        debugDraw.SetFillAlpha(0.5)
        debugDraw.SetLineThickness(1.0)
        debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit)
        world.SetDebugDraw(debugDraw)
      }

      //set standard mouse listener
      var displayPosition = getPosition(DISPLAY_DIV)
      document.addEventListener('mousemove', handleMouseMove)
      function handleMouseMove (e) {
        engine.mouseX = (e.clientX - displayPosition.x) / PIXEL_SCALE
        engine.mouseY = (e.clientY - displayPosition.y) / PIXEL_SCALE
      }
      document.addEventListener('mousedown', function(e) {
        engine.isMouseDown = true
        handleMouseMove(e)
      }, true)
      document.addEventListener('mouseup', function() {
        engine.isMouseDown = false
      }, true)

      ready()

      engine.bigBang()

      //game loop - world
      window.setInterval(updateWorld, 1000 / P_FRAME_RATE)

      //game loop - display
      Crafty.bind('enterframe', drawWorldEvent);
    }
  }

  var dynamicBody = this.dynamicBody = b2Body.b2_dynamicBody
    , staticBody = this.staticBody = b2Body.b2_staticBody

  this.getThingAtMouse = function () {
    var body = getBodyAtMouse()
    return body ? body.thing : null
  }

  function getBodyAtMouse () {
    engine.selectedBody = null
    if (engine.isMouseDown) {
      engine.mousePVec = new b2Vec2(engine.mouseX, engine.mouseY)
      var aabb = new b2AABB()
      aabb.lowerBound.Set(engine.mouseX - 0.001, engine.mouseY - 0.001)
      aabb.upperBound.Set(engine.mouseX + 0.001, engine.mouseY + 0.001)
      world.QueryAABB(getBodyCB, aabb)
    }
    return engine.selectedBody
  }

  function getBodyCB (fixture) {
    if (fixture.GetBody().GetType() != b2Body.b2_staticBody) {
      if (fixture.GetShape().TestPoint(fixture.GetBody().GetTransform()
                                      , engine.mousePVec
                                      ) ) {
        engine.selectedBody = fixture.GetBody()
        return false
      }
    }
    return true
  }


  this.Rect = function (config) {
    config = config || {}
    var bodyType = this.bodyType = defined(config.bodyType, dynamicBody)
      , x = this.x = defined(config.x, DISPLAY_WIDTH/2)
      , y = this.y = defined(config.y, DISPLAY_HEIGHT/2)
      , w = this.w = config.w || 1
      , h = this.h = config.h || 1
      , c = this.c = defined(config.c, 0x999999)
      , lc = this.lc = defined(config.lc, '#000000')
      , originX = this.originX = defined(config.originX ,8.5)
      , originY = this.originY = defined(config.originY ,8.5)
      , sprite = this.sprite = Crafty.e('Color' ,'2D' ,'DOM' ,'animate')
                               .attr({ w: w
                                     , h: h
                                     })
                               .origin(originX ,originY)
                               .color(c)
      , body = this.body = b2Ex.createRect( world
        , { bodyType: bodyType
          , w: w/PIXEL_SCALE
          , h: h/PIXEL_SCALE
          , x: x/PIXEL_SCALE
          , y: y/PIXEL_SCALE
          })

    sprite.x = body.GetPosition().x * PIXEL_SCALE-sprite._origin.x
    sprite.y = body.GetPosition().y * PIXEL_SCALE-sprite._origin.y
    body.thing = sprite.thing = this
  }

  this.Image = function (config) {
    config = config || {}
    var bodyType = this.bodyType = defined(config.bodyType, dynamicBody)
      , x = this.x = defined(config.x, DISPLAY_WIDTH/2)
      , y = this.y = defined(config.y, DISPLAY_HEIGHT/2)
      , w = this.w = config.w || 1
      , h = this.h = config.h || 1
      , r = this.r = config.r || 1
      , originX = this.originX = defined(config.originX ,8.5)
      , originY = this.originY = defined(config.originY ,8.5)
      , spriteName = this.spriteName = config.spriteName || 'rect'
      , shape = this.shape = defined(config.shape, 'rect')
      , sprite = this.sprite = Crafty.e(spriteName ,'2D' ,'DOM' ,'animate')
                               .attr({ w: w
                                     , h: h
                                     })
                               .origin(originX ,originY)
      , body

    if (shape == 'rect') {
      sprite.w = w
      sprite.h = h
      body = this.body = b2Ex.createRect( world
      , { bodyType: bodyType
        , w: w/PIXEL_SCALE
        , h: h/PIXEL_SCALE
        , x: x/PIXEL_SCALE
        , y: y/PIXEL_SCALE
        }
      )
      sprite.x = body.GetPosition().x * PIXEL_SCALE-sprite._origin.x
      sprite.y = body.GetPosition().y * PIXEL_SCALE-sprite._origin.y
    }
    body.thing = sprite.thing = this
  }

  this.addThing = function (thing) {
    things.push(thing)
    return thing
  }

  this.addJoint = function (joint) {
    if (joint.exists) {
      joints.push(joint)
      return joint
    }
    else {
      engine.destroyJoint(joint)
    }
    return null
  }

  this.MouseJoint = function (config) {
    config = config || {}
    var visible = config.visible ? true : false
    var thing = defined(config.thing, engine.getThingAtMouse())
    this.setTarget = function(x, y) {
      this.joint.SetTarget(new b2Vec2(x, y))
    }
    if (thingExists(thing)) {
      this.visible = config.visible ? true : false
      this.jointDef = new b2MouseJointDef()
      this.jointDef.bodyA = world.GetGroundBody()
      var body = this.jointDef.bodyB = thing.body
      var x, y
      x = defined(config.targetx, engine.mouseX)
      y = defined(config.targety, engine.mouseY)
      this.jointDef.target.Set(x, y)
      this.jointDef.collideConnected = defined(config.collideConnected, true)
      this.jointDef.maxForce = defined(config.maxForce, 300 * body.GetMass())
      this.joint = world.CreateJoint(this.jointDef)
      this.exists = true
      body.SetAwake(true)
    }
    else {
      this.exists = false
    }
  }

  this.destroyJoint = function (joint) {
    if (jointExists(joint)) {
      world.DestroyJoint(joint.joint)
      removeFromArray(joint, joints)
      joint.exists = false
    }
  }

  this.destroyThing = function (thing) {
    if (thingExists(thing)) {
      world.DestroyBody(thing.body)
      thing.sprite.destroy()
      removeFromArray(thing, things)
    }
  }

  function jointExists (joint) {
    for (var j = 0; j < joints.length; j++) {
      if (joints[j] === joint) {
        return true
      }
    }
    return false
  }

  function thingExists (thing) {
    for (var t = 0; t < things.length; t++) {
      if (things[t] === thing) {
        return true
      }
    }
    return false
  }

  this.bigBang = function () {
    updateWorld()
    drawWorld(true)
  }

  this.sprite = Crafty.sprite

  var behaviors = {}

  this.addBehavior = function (name, f) {
    behaviors[name] = f
  }

  this.removeBehavior = function (name) {
    delete behaviors[name]
  }

  function updateWorld () {
    for (var behavior in behaviors) {
      behaviors[behavior]()
    }
    world.Step(1 / 30, 10, 10)
    if (DEBUG) {
      world.DrawDebugData()
    }
    world.ClearForces()
  }

  function drawWorldEvent () {
    drawWorld()
  }

  function drawWorld(drawEverything) {
    for (var i = 0; i < things.length; i++) {
      drawSprite(things[i], drawEverything)
    }
  }

  function drawSprite(thing, drawEverything) {
    if ( (thing.body.IsAwake() && thing.bodyType != staticBody)
      || drawEverything
       ) {
      thing.sprite.rotation = thing.body.GetAngle() * 180 / Math.PI
      thing.sprite.x = thing.body.GetPosition().x * PIXEL_SCALE
                     - thing.sprite._origin.x
      thing.sprite.y = thing.body.GetPosition().y * PIXEL_SCALE
                     - thing.sprite._origin.y
      if (!drawEverything) console.log(thing.sprite.x, thing.sprite.y)
    }
  }

}

function getPosition(element) {
  var elem=document.getElementById(element), tagname='', x=0, y=0
  while ((typeof(elem) == 'object') && (typeof(elem.tagName) != 'undefined')){
    y += elem.offsetTop
    x += elem.offsetLeft
    tagname = elem.tagName.toUpperCase()
    if (tagname == 'BODY') {
      elem=0
    }
    if (typeof(elem) == 'object') {
      if (typeof(elem.offsetParent) == 'object') {
        elem = elem.offsetParent
      }
    }
  }
  return {x: x, y: y}
}

// Array.prototype.findIndex = function (o) {
function findIndex (o, a) {
  var index
  for (var i = 0; i < a.length; i++) {
    if (a[i]===o) {
      return i
    }
  }
  return null
}

//Array.prototype.remove = function (o) {
function removeFromArray (o, a) {
  var index
  while (null !== (index = findIndex(o, a))) {
    a.splice(index, 1)
  }
}
