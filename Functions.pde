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


  
  
  //++++++++++++++++++++++++++++++++
  //    Light Section
  
  void TOD(){
    
   /*
  //if(mousePressed){
      
  LightX += 0.2;
  LightY += 0.2;
  LightZ += 0.2;
  
  if(LightY >= 150){
  LightY -= 1;
  }
  
  if(LightZ >= 150){
  LightZ -= 1;
  }

  
  
      
  ambientLight(LightX, LightY, LightZ);
  */
  
    //}
    
    lights();
    
    
  }
  
  
  
  //++++++++++++++++++++++++++++++++
  //    Background_Switch
  
    void Background_Switch(){
    
      
      bg_r = random(0, 255);
      bg_g = random(0, 255);
      bg_b = random(0, 255);
      
      //background(bg_r,bg_g,bg_b);
      background(200);
    
    }
    
    
    
    
    
    
    
    /**/
    //Table Data Display Test
    void Table_Display(){
      for (TableRow row : table.rows()) {
    float lat = row.getFloat("latitude");
    float lon = row.getFloat("longitude");
    float mag = row.getFloat("mag");
    float theta = radians(lat) + PI/2;
    float phi = radians(lon) + PI;
    float x = r * sin(theta) * cos(phi);
    float y = -r * sin(theta) * sin(phi);
    float z = r * cos(theta);
    PVector pos = new PVector(x, y, z);

    float h = pow(10, mag);
    float maxh = pow(10, 7);
    h = map(h, 0, maxh, 10, 100);
    PVector xaxis = new PVector(1, 0, 0);
    float angleb = PVector.angleBetween(xaxis, pos);
    PVector raxis = xaxis.cross(pos);



    pushMatrix();
    translate(x, y, z);
    rotate(angleb, raxis.x, raxis.y, raxis.z);
    fill(255);
    box(h, 5, 5);
    popMatrix();
  }
    }
    /**/
  
  