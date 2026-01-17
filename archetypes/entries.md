+++
title = '{{ replace .File.ContentBaseName "-" " " | title }}'
date  = '{{ time.Now.UTC.Format "2006-01-02" }}'
draft = true

url     = '/entry/{{ replaceRE `([\/])` "-" .File.Dir }}/'
aliases = ['/previous-urls-if-applicable']

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
+++

{{< linkbox
    author="[Name/Nickname of the author]"
    date="{{ time.Now.UTC.Format "2006-01-02" }}"
    image="link_01.jpg"
    title="[Title of the page]"
    url="[URL of the page]"
>}}
Description or summary of the linked page. Should not be longer than a fex sentences.
{{< /linkbox >}}
