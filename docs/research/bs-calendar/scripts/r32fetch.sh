#!/bin/bash
y=$1; d=web/r32; i=0
for m in baisakh jestha ashad shrawan bhadra ashwin kartik mangsir poush magh falgun chaitra; do i=$((i+1))
 f=$d/$y-$i.html; curl -sL --max-time 60 -A "Mozilla/5.0" "https://nepalicalendar.rat32.com/$y/$m" -o $f
 python3 -I scripts/r32.py $f > $d/$y-$i.json; rm -f $f; done
