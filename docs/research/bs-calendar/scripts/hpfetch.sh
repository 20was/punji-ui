#!/bin/bash
# usage: hpfetch.sh year
y=$1; d=web/hp; mkdir -p $d
for m in 2 5 8 11; do
  f=$d/$y-$m.html
  curl -sL --max-time 60 -A "Mozilla/5.0" "https://www.hamropatro.com/calendar/$y/$m/" -o $f
  python3 -I scripts/hp.py $f > $d/$y-$m.json; rm -f $f
done
