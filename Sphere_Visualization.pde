import controlP5.*;
ControlP5 cp5;



void setup() {

  //size(displayWidth, displayHeight, P3D);
  fullScreen(P3D);


  frameRate(60);
  
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


  //Light Section
  TOD();
  
  fill(200);
  shape(globe);
}