


float angle;
float r = 200;

PImage earth;
PShape globe;


void setup() {

  size(600, 600, P3D);
  
    //GUI Creation
  cp5 = new ControlP5(this);
  
  cp5.addSlider("sliderValue")
  .setPosition(100,50)
  .setRange(0,255)
  ;
  //
  
  
  earth = loadImage("earth_s.jpg");
  noStroke();
  globe= createShape(SPHERE, r);
  globe.setTexture(earth);
  

}


void draw() {

  background(51);
  //image(earth, 0, 0);
 
  
  translate(width*0.5, height*0.5);
  
  rotateY(angle);
  angle += 0.005;
  
  lights();
  
  fill(200);
  shape(globe);
}