//Initialize Engine
var engine = new Engine(
  { displayDiv: 'display'
  , displayWidth: 600
  , displayHeight: 400
  , pixelScale: 30
  , gFrameRate: 20
  , pFrameRate: 30
  , debug: true
  }
)

engine.ready(function () {

  //Load sprites

  engine.sprite( 50
               , 'foo.jpg'
               , { rect: [0,0]
                 }
               )

  //Create Things

  //create ground/walls
  var ground = engine.addThing(new engine.Rect(
    { bodyType: engine.staticBody
    , x: 1
    , y: engine.DISPLAY_HEIGHT - 1
    , w: engine.DISPLAY_WIDTH
    , h: 2
    , c: 0x999999
    }
  ))
  var sky = engine.addThing(new engine.Rect(
    { bodyType: engine.staticBody
    , x: 1
    , y: 1
    , w: engine.DISPLAY_WIDTH
    , h: 2
    , c: 0x999999
    }
  ))
  var leftWall = engine.addThing(new engine.Rect(
    { bodyType: engine.staticBody
    , x: 1
    , y: 1
    , w: 2
    , h: engine.DISPLAY_HEIGHT
    , c: 0x999999
    }
  ))
  var rightWall = engine.addThing(new engine.Rect(
    { bodyType: engine.staticBody
    , x: engine.DISPLAY_WIDTH-1
    , y: 1
    , w: 2
    , h: engine.DISPLAY_HEIGHT
    , c: 0x999999
    }
  ))

  //create some randomthings
  for (var i = 0; i < 10; i++) {
    createRandomThing()
  }

  function createRandomThing (config) {
    config = config || {}
    var x = defined(config.x, Math.random() * (engine.DISPLAY_WIDTH-50)+25)
    var y = defined(config.y, Math.random() * (engine.DISPLAY_HEIGHT-50)+25)
    var thing
    if (Math.random() > .5) {
      thing = engine.addThing(new engine.Image(
        { shape: 'rect'
        , x: x
        , y: y
        , w: 50
        , h: 50
        , originX: 25.5
        , originY: 25.5
        , c: (Math.random() * 0xffffff)
        }
      ))
    }
    else {
      // thing = engine.addThing(new engine.Circle(
      //   { x: x
      //   , y: y
      //   , r: (Math.random() + 0.1)*2
      //   , c: (Math.random() * 0xffffff)
      //   }
      // ))
    }
    return thing
  }

  //Behaviors

  // //memory leak testing code
  // var last = null
  // engine.addBehavior('testMemoryLeak', function () {
  //   engine.destroyThing(last)
  //   last = createRandomThing()
  // })

  document.getElementById('grabButton')
          .addEventListener('click', applyGrab)
  document.getElementById('destroyButton')
          .addEventListener('click', applyDestroy)
  document.getElementById('createButton')
          .addEventListener('click', applyCreate)

  var joint = null
  function applyGrab () {
    engine.removeBehavior('destroy')
    engine.removeBehavior('create')
    engine.addBehavior('grab', function() {
      if (engine.isMouseDown) {
        if (!joint) {
           joint = engine.addJoint(new engine.MouseJoint())
        }
        if (joint) {
          joint.setTarget(engine.mouseX, engine.mouseY)
        }
      }
      else if (joint) {
        engine.destroyJoint(joint)
        joint = null
      }
    })
  }

  function applyDestroy () {
    engine.removeBehavior('grab')
    engine.removeBehavior('create')
    engine.addBehavior('destroy', function() {
      if (engine.isMouseDown) {
        engine.destroyThing(engine.getThingAtMouse())
      }
    })
  }

  var creatable = true
  function applyCreate () {
    engine.removeBehavior('grab')
    engine.removeBehavior('destroy')
    engine.addBehavior('create', function() {
      if (!engine.isMouseDown) {
        creatable = true
      }
      if (engine.isMouseDown && creatable) {
        creatable = false
        createRandomThing( { x: engine.mouseX
                           , y: engine.mouseY
                           }
                         )
      }
    })
  }
})
