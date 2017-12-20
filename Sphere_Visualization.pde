import controlP5.*;
ControlP5 cp5;

float angleUp;
float angleY;
float angleX;

//Maybe delete me
float ScrollSize = 0.5;
float ScrollIndex;


float currentRotY;
float currentRotLerpY;
float RotationMomentY;

float r = 200;

PImage earth;
PShape globe;


//++ LIGHT VARIABLES
int LightX;
int LightY;
int LightZ;

void setup() {

  size(displayWidth, displayHeight, P3D);
  //fullScreen(P3D);


  //Function for calling the GUI to be created
  //draw_GUI();
  
  //smooth();

  //Function for loading the Earth Image and Create Shape and Texture Sphere
  loadAndCreateEarth();
}


void draw() {
  background(51);



/*
   // Change height of the camera with mouseY
    camera(0.0, 476, 220.0, // eyeX, eyeY, eyeZ
         0.0, 0.0, 0.0, // centerX, centerY, centerZ
         0.0, 1.0, 0.0); // upX, upY, upZ
*/
  //image(earth, 0, 0);
  

  translate(width*0.5, height*0.5,ScrollSize);
 

  RotateEarthMousePressed();
  
  Scroll_Earth();


  TOD();
  
  fill(200);
  shape(globe);
}