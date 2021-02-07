#!/bin/bash
# Last Modified: 02/02/2021
# Return disk space in kilobytes

df -k --output=avail / | tail -1

exit 0
