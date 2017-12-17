//
//
/*This is the File for the functions that are needed to stay oragnized*/
//
//




void loadAndCreateEarth() {

  earth = loadImage("earth_s.jpg");
  noStroke();
  globe= createShape(SPHERE, r);
  globe.setTexture(earth);
}



void RotateEarthMousePressed() {
  //Function when mouse is pressed let the Earth rotate based on the MouseX and MouseY
  if (mousePressed) {
    rotateY(angleY);
    angleY += 0.01;
    currentRotY = angleY;
  } else {
    rotateY(currentRotY);
  }
}