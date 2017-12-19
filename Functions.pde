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
  
/*
  //Function when mouse is pressed let the Earth rotate based on the MouseX and MouseY
  
  */
  
  
     if (mousePressed) {
       
    rotateY(currentRotLerpY);
    //rotateX(angleX);
    
    //angleY += 0.01;
    //currentRotY = angleY;
    
    //angleY = mouseX/60/PI;
    
    angleY = mouseX/60/PI;
    currentRotY = angleY;
    //currentRotLerp = lerp(angleY, currentRotY,1);
    currentRotLerpY = lerp(RotationMomentY, mouseX/50/PI, 0.6);
    
    //angleX = mouseY/60/PI;
    RotationMomentY = currentRotLerpY;
  } 
  
  else{
  
    rotateY(RotationMomentY);
  }
  
}
  
    /*else {
    rotateY(currentRotY);
   
    angleY = mouseX/60/PI;
    angleX = mouseY/60/PI;
    
    rotateY(angleY);
    rotateX(angleX);
    
    //print(angleY);
    //angleY += 0.01;
  }
  else{
  rotateY(angleY);
  rotateX(angleX);
    }
  }
  */
  
  
  
  
  
  void Scroll_Earth(){
    mouseWheel();
  
     
}


void mouseWheel(MouseEvent event) {
  float e = event.getCount();
  ScrollIndex = ScrollIndex + e;
 
//Scrollindex can only be equal or more than 0
if(ScrollIndex <= -0){
  ScrollIndex = 0;
}
  
  //Counting Index 
  //Need a few if- Statements to declare when to zoom and how much
  print(ScrollIndex);


}
  
  
  
  