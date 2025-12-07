+++
title = '{{ replace .File.ContentBaseName "-" " " | title }}'
date  = '{{ time.Now.UTC.Format "2006-01-02" }}'
draft = true

parts = ['3002', '3004']
size = ['2s', '3p', '4b']
uses = ['another-entry']
tags = [
  'angle-studtilt-[1-180]', 
  'angle-studturn-[1-180]',
  
  'length-studlift-[1-10]', 
  'length-studshift-[1-10]',
  
  'partcount-segment-[1-999]', 
  'partcount-total-[1-999]',
  
  'repeat-linear', 
  'repeat-planar', 
  'repeat-spacial', 
  'repeat-circular',

  'shape-circle', 
  'shape-ellipse', 
  'shape-polygon-[3-999]', 
  'shape-polyhedron-[4-999]', 
  'shape-sphere', 
  'shape-star-[5-999]', 
  'shape-toroid',

  'warning-stress',
]

[[resources]]
src              = 'image.jpg'
params.copyright = '©{{ time.Now.Format "2006" }} BrickCamp'
params.reference = 'https://brick.camp'

+++

{{< linkbox url="https://example.com" >}}
