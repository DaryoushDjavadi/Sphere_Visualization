//
//
/*This is the File for the GUI*/
//
//




void draw_GUI(){

  
    cp5 = new ControlP5(this);
  
  // add a horizontal sliders, the value of this slider will be linked
  // to variable 'sliderValue' 
  cp5.addSlider("sliderValue")
     .setPosition(width*0.5,height*0.5)
     .setRange(0,255)
     ;
  
  
  
  
}