/**
 * Worm.js inherts Sprite.js
 *
 * This contains all the logic for each indvdiual worm entity. 
 * Its physics objects, sprite drawing, movements etc
 *
 *  License: Apache 2.0
 *  author:  Ciar�n McCann
 *  url: http://www.ciaranmccann.me/
 */
///<reference path="system/Graphics.ts"/>
///<reference path="system/AssetManager.ts"/>
///<reference path="system/Physics.ts"/>
///<reference path="animation/Sprite.ts"/>
///<reference path="animation/HealthReduction.ts"/>
///<reference path="weapons/Drill.ts"/>
///<reference path="Team.ts"/>
///<reference path="system/Utilies.ts" />
///<reference path="system/NameGenerator.ts" />
///<reference path="Terrain.ts" />
///<reference path="Main.ts" />
///<reference path="WormAnimationManger.ts" />
///<reference path="Target.ts" />

class Worm extends Sprite
{
    DIRECTION = {
        left: -1,
        right: 1
    }

    body;
    fixture;
    direction;
    speed;
    canJump: number;
    name;

    damageTake;
    health;

    //Pre-render shapes for text
    nameBox;
    healthBox;

    team: Team;
    footSensor;
    stateAnimationMgmt: WormAnimationManger;
    target: Target;
    isDead: bool;

    soundDelayTimer: Timer;


    constructor (team, x, y)
    {
        super(Sprites.worms.idle1);
        this.name = NameGenerator.randomName();
        this.health = 100;
        this.damageTake = 0;
        this.team = team;

        x = Physics.pixelToMeters(x);
        y = Physics.pixelToMeters(y);
        var circleRadius = (AssetManager.images[this.spriteDef.imageName].width / 2) / Physics.worldScale;

        var fixDef = new b2FixtureDef;
        fixDef.density = 1.0;
        fixDef.friction = 1.0;
        fixDef.restitution = 0.1;
        fixDef.shape = new b2CircleShape(circleRadius);
        fixDef.shape.SetLocalPosition(new b2Vec2(0, (circleRadius) * -1));

        var bodyDef = new b2BodyDef;
        bodyDef.type = b2Body.b2_dynamicBody;
        bodyDef.position.x = x;
        bodyDef.position.y = y;

        this.fixture = Physics.world.CreateBody(bodyDef).CreateFixture(fixDef);
        this.body = this.fixture.GetBody();
        this.body.SetFixedRotation(true);
        this.body.SetSleepingAllowed(false);
        this.direction = 1
        this.speed = 1.2;

        // Setup foot sensor
        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsBox(circleRadius / 2, circleRadius / 4);
        fixDef.isSensor = true;
        this.footSensor = this.body.CreateFixture(fixDef);



        this.body.SetUserData(this);
        this.stateAnimationMgmt = new WormAnimationManger(this);

        this.canJump = 0;

        this.target = new Target(this);
        this.isDead = false;

        this.soundDelayTimer = new Timer(200);

        this.preRendering();
       
    }

    // Pre-renders the boxes above their heads with name and health
    preRendering()
    {
        var nameBoxWidth = this.name.length * 10;
        var healthBoxWidth = 39;
        var healthBoxHeight = 18
        this.nameBox = Graphics.preRenderer.render(function (ctx) =>
        {

            ctx.fillStyle = '#1A1110';
            ctx.strokeStyle = "#eee";
            ctx.font = 'bold 16.5px Sans-Serif';
            ctx.textAlign = 'center';

            Graphics.roundRect(ctx, 0,0, nameBoxWidth, 20, 4).fill();
            Graphics.roundRect(ctx, 0,0, nameBoxWidth, 20, 4).stroke();

            ctx.fillStyle = this.team.color;
            ctx.fillText(this.name, (this.name.length * 10)/2, 15);

         },nameBoxWidth , 20);

        this.healthBox = Graphics.preRenderer.render(function (ctx) =>
        {

            ctx.fillStyle = '#1A1110';
            ctx.strokeStyle = "#eee";
            ctx.font = 'bold 16.5px Sans-Serif';
            ctx.textAlign = 'center';

            Graphics.roundRect(ctx, 0, 0, healthBoxWidth, healthBoxHeight, 4).fill();
            Graphics.roundRect(ctx, 0, 0, healthBoxWidth, healthBoxHeight, 4).stroke();

            ctx.fillStyle = this.team.color;
            ctx.fillText(Math.floor(this.health), healthBoxWidth/2, healthBoxHeight-3);

         }, 39, 20);


    }

    getHealth() { return this.health; }

    setHealth(health: number)
    {
        if (health > 0)
        {
            this.health = health;

        } else
        {
            this.health = 0;
        }

        this.preRendering();
    }

   

    // What happens when a worm collies with another object
    beginContact(contact)
    {
        if (Physics.isCollisionBetweenTypes(Terrain, Worm, contact))
        {
            if (this.footSensor == contact.GetFixtureA() || this.footSensor == contact.GetFixtureB())
            {
                this.canJump++;
                
                if (this.body.GetLinearVelocity().Length() > 10)
                {
                    this.hit(5);
                }
            }
        }
    }

    //What happens when a worm is no longer in contact with the object it was in contact with
    endContact(contact)
    {
        if (Physics.isCollisionBetweenTypes(Terrain, Worm, contact))
        {
            if (this.footSensor == contact.GetFixtureA() || this.footSensor == contact.GetFixtureB())
            {
                this.canJump--;
            }
        }
    }

    fire()
    {
        this.team.getWeaponManager().getCurrentWeapon().activate(this);
        AssetManager.sounds["fire"].play();
        
    }

    playWalkingSound()
    {
        if (this.soundDelayTimer.hasTimePeriodPassed())
        {
            if (this.spriteDef == Sprites.worms.walking)
            {
                if (super.getCurrentFrame() % 5 == 0)
                {
                    AssetManager.sounds["WalkCompress"].play(0.5);
                } else
                {
                    AssetManager.sounds["WalkExpand"].play(0.5);
                }
            }
        }
    }

    walkLeft()
    {
        if (this.team.getWeaponManager().getCurrentWeapon().getIsActive() == false)
        {
            var currentPos = this.body.GetPosition();

            this.direction = this.DIRECTION.left;
            this.stateAnimationMgmt.setState(WormAnimationManger.WORM_STATE.walking);

            super.update();
            this.body.SetPosition(new b2Vec2(currentPos.x - this.speed / Physics.worldScale, currentPos.y));
            
            this.playWalkingSound();
        }

    }

     walkRight()
    {
        if (this.team.getWeaponManager().getCurrentWeapon().getIsActive() == false)
        {
            var currentPos = this.body.GetPosition();
            this.direction = this.DIRECTION.right;
            this.stateAnimationMgmt.setState(WormAnimationManger.WORM_STATE.walking);

            super.update();
            this.body.SetPosition(new b2Vec2(currentPos.x + this.speed / Physics.worldScale, currentPos.y));

            this.playWalkingSound();
        }

    }



    jump()
    {

        if (this.team.getWeaponManager().getCurrentWeapon().getIsActive() == false)
        {
            if (this.canJump > 0)
            {

                var currentPos = this.body.GetPosition();
                var forces = new b2Vec2(0, 1);
                forces.Multiply(40);

                this.body.ApplyImpulse(forces, this.body.GetPosition());
            }
        }
    }

    hit(damage, worm = null)
    {
        this.damageTake += damage;
        AssetManager.sounds["ow" + Utilies.random(1, 2)].play(0.8);
  
        //if from same team call the player a tratitor :)
        if (worm && worm != this && worm.team == this.team)
        {
            AssetManager.sounds["traitor"].play(0.8, 10);

        } else if( worm ) // if there was a worm envolved in the damage
        {
            Utilies.pickRandomSound(["justyouwait","youllregretthat"]).play(0.8,10);         
        }
    }

   
    //Is this the current worm of the current player
    isActiveWorm()
    {
        return this.team.getCurrentWorm() == this && GameInstance.getCurrentPlayerObject().getTeam() == this.team;
    }


    update()
    {
        
        this.soundDelayTimer.update();

        if (this.team.getCurrentWorm().body && this.team.getCurrentWorm().body.GetLinearVelocity().Length() > 1)
        {
            GameInstance.camera.panToPosition(Physics.vectorMetersToPixels(this.team.getCurrentWorm().body.GetPosition()));
        }
        //Manages the different states of the animation
        this.stateAnimationMgmt.update();

        //updates the current sprite
        super.update();

        // Always reset to idle
        this.stateAnimationMgmt.setState(WormAnimationManger.WORM_STATE.idle);

        this.team.getWeaponManager().getCurrentWeapon().update();
        this.target.update();

    }

    draw(ctx)
    {
        this.team.getWeaponManager().getCurrentWeapon().draw(ctx);

        if (Sprites.worms.weWon != this.spriteDef)
        {
            this.target.draw(ctx);
        }

        ctx.save()

        var radius = this.fixture.GetShape().GetRadius() * Physics.worldScale;

        ctx.translate(
            Physics.metersToPixels(this.body.GetPosition().x),
            Physics.metersToPixels(this.body.GetPosition().y)
        )

        ctx.save()
        if (this.direction == this.DIRECTION.right)
        {
            // Used to flip the sprites       
            ctx.scale(-1, 1);
        }

        super.draw(ctx,
            -radius,
            -radius*2.5);

        ctx.restore()

        //TODO Optimize the shit out of the, maybe pre-render? 
          var nameBoxX = -radius * this.name.length / 2.6;
            var nameBoxY = -radius * 6;
           // var nameBoxWidth = ;

       

        ctx.drawImage(this.nameBox, nameBoxX, nameBoxY);
        ctx.drawImage(this.healthBox, -radius * 1.5, -radius * 4);

            //Graphics.roundRect(ctx, -radius * 1.5, -radius * 4, 39, 18, 4).fill();
            //Graphics.roundRect(ctx, -radius * 1.5, -radius * 4, 39, 18, 4).stroke();

            //ctx.fillStyle = this.team.color;
            //ctx.fillText(this.name, 0, -radius * 4.7);
            //ctx.fillText(Math.floor(this.health), 0, -radius * 2.8);

      

     

        ctx.restore()

    }

}