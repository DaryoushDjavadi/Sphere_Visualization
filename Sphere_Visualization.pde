import controlP5.*;

import peasy.*;


ControlP5 cp5;
PeasyCam cam;
Chart myChart;

import processing.opengl.*;


void setup() {

  //size(displayWidth, displayHeight, P3D);
  fullScreen(P3D);
  
  
  table = loadTable("http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv", "header");


  cam = new PeasyCam(this, 800);

  
  frameRate(60);
  
  //Function for calling the GUI to be created
  draw_GUI();


  
  //smooth();

  //Function for loading the Earth Image and Create Shape and Texture Sphere
  loadAndCreateEarth();
}


void draw() {
  //background(51);
  Background_Switch();

  
  //Chart
    // unshift: add data from left to right (first in)
  //myChart.unshift("incoming", (sin(frameCount*0.1)*20));
  
  // push: add data from right to left (last in)
  myChart.push("incoming", (sin(frameCount*0.1)*10));
  //Chart
  

/*
   // Change height of the camera with mouseY
    camera(0.0, 476, 220.0, // eyeX, eyeY, eyeZ
         0.0, 0.0, 0.0, // centerX, centerY, centerZ
         0.0, 1.0, 0.0); // upX, upY, upZ
*/
  //image(earth, 0, 0);
  


 //translate(width*0.5, height*0.5,ScrollSize);

  pushMatrix();
  
  //RotateEarthMousePressed();
  
  //Scroll_Earth();


  Table_Display();
  //Light Section
  TOD();
  
  //fill(200);
  shape(globe);
  
  
   popMatrix();
  // makes the gui stay on top of elements
  // drawn before.
 
  gui();
  
}






void gui() {
  hint(DISABLE_DEPTH_TEST);
  cam.beginHUD();
  cp5.draw();
  cam.endHUD();
  hint(ENABLE_DEPTH_TEST);
}