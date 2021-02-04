#!/bin/bash
# Last Modified: 02/02/2021
# Return temperature in Celsius

TEMP=0
NEXTTEMP=0

for i in `ls -d /sys/class/thermal/thermal_zone*`; do
  NEXTTEMP=$(cat $i/temp)
  [ $TEMP -ne 0 ] && {
    TEMP=$(($TEMP+$NEXTTEMP))
    TEMP=$(($TEMP/2))
  } || {
    TEMP=$NEXTTEMP
  }
done

INTTEMP=$(($TEMP/1000))
INTLENGTH=$(expr length $INTTEMP)
DECTEMP=${TEMP:$INTLENGTH}
echo "${INTTEMP}.${DECTEMP}"

exit 0
