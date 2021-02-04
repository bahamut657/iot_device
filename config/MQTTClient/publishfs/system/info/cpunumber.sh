#!/bin/bash
# Last Modified: 02/02/2021
# Return CPUs number

grep -c ^processor /proc/cpuinfo

exit 0
