float angle;


void setup() {

  size(600, 600, P3D);
  
  //int angle = 0;
  
}


void draw() {

  background(51);
  translate(width*0.5, height*0.5);
  
  rotateY(angle);
  angle += 0.005;
  
  lights();
  fill(200);
  //noStroke();
  sphere(200);
}