//
//
/*This is the File for the functions that are needed to stay oragnized*/
//
//




void loadAndCreateEarth() {

  earth = loadImage("earth_s.jpg");
  //noStroke();
  globe= createShape(SPHERE, r);
  globe.setTexture(earth);
}



void RotateEarthMousePressed() {
  
/*
  //Function when mouse is pressed let the Earth rotate based on the MouseX and MouseY
  
  */
  
  
     if (mousePressed) {
       
    
    
    currentRotLerpY = lerp(RotationMomentY, mouseX/50/PI, 0.1);
    RotationMomentY = currentRotLerpY;
    
    rotateY(currentRotLerpY);
  } 
  
  else{
    rotateY(RotationMomentY);
  }
  
}

  
  
  
  
  
  void Scroll_Earth(){
    mouseWheel();  
}


void mouseWheel(MouseEvent event) {
  float e = event.getCount();
  ScrollIndex = ScrollIndex + e;
  ScrollSize = ScrollIndex*10;
 
//Scrollindex can only be equal or more than 0
if(ScrollIndex <= -0){
  ScrollIndex = 0;
}
  
  //Counting Index 
  //Need a few if- Statements to declare when to zoom and how much
  print(ScrollIndex);
}
  
  
  
  
  //++++++++++++++++++++++++++++++++
  //    Light Section
  
  void TOD(){
    
    if(mousePressed){
      
  LightX += 1;
  LightY += 1;
  LightZ += 1;
  
  
      
  ambientLight(LightX, LightY, LightZ);
  
  
    }
  }
  
  
  