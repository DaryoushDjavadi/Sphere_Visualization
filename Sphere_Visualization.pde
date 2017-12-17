import controlP5.*;
ControlP5 cp5;

float angleY;
float currentRotY;
float r = 200;

PImage earth;
PShape globe;

void setup() {

  size(600, 600, P3D);

  //Function for calling the GUI to be created
  draw_GUI();

  //Function for loading the Earth Image and Create Shape and Texture Sphere
  loadAndCreateEarth();
}


void draw() {
  background(51);



  //image(earth, 0, 0);
  
  translate(width*0.5, height*0.5);


  RotateEarthMousePressed();


  lights();
  fill(200);
  shape(globe);
}