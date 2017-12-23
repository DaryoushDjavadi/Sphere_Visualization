//
//
/*This is the File for the GUI*/
//
//




void draw_GUI(){

  /*
    cp5 = new ControlP5(this);
  
  
  
  // add a horizontal sliders, the value of this slider will be linked
  // to variable 'sliderValue' 
  cp5.addSlider("sliderValue")
     .setPosition(100,100)
     .setRange(0,255)
     ;
  
  
  */
  
  
  cp5 = new ControlP5(this);
  cp5.addButton("button", 10, 100, 60, 80, 20).setId(1);
  cp5.addButton("buttonValue", 4, 100, 90, 80, 20).setId(2);
  
  
  //
    Group g1 = cp5.addGroup("g1")
                .setPosition(100,300)
                .setSize(300,100)
                .setBackgroundHeight(600)
                .setBackgroundColor(color(255,50))
                ;
  //
    cp5.addSlider("S-1")
     .setPosition(10,10)
     .setSize(180,9)
     .setGroup(g1)
     ;
  //
  myChart = cp5.addChart("dataflow")
               .setPosition(10, 50)
               .setSize(200, 100)
               .setRange(-20, 20)
               .setView(Chart.LINE) // use Chart.LINE, Chart.PIE, Chart.AREA, Chart.BAR_CENTERED
               .setStrokeWeight(1.5)
               .setColorCaptionLabel(color(40))
               .setGroup(g1)
               ;

  myChart.addDataSet("incoming");
  myChart.setData("incoming", new float[100]);
  //
  
  cp5.setAutoDraw(false);
  
  
  
  //NEW GROUP PART
  //
    Group g2 = cp5.addGroup("g2")
                .setPosition(displayWidth/1.4,300)
                .setSize(300,100)
                .setBackgroundHeight(600)
                .setBackgroundColor(color(255,50))
                ;
                
                
    myTextlabelA = cp5.addTextlabel("label")
                    .setText("LMB for Rotate, MMB for Pan, RMB for Dolly")
                    .setPosition(0,0)
                    .setColorValue(0xffffff00)
                    .setFont(createFont("Helvetica",20))
                    .setGroup(g2)
                    ;
                    
                    
    // create a toggle and change the default look to a (on/off) switch look
    cp5.addToggle("Autorotate")
     .setPosition(20, 50)
     .setSize(100,40)
     .setValue(true)
     .setMode(ControlP5.SWITCH)
     .setGroup(g2)
     ;
                
  // GROUP PART END
  
  
  
}