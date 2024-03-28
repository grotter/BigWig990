#!/bin/sh
rsync -av . ec2-user@antifascistscience.club:/var/www/html/grotter/bigwig990/ --exclude=".*" --exclude="*.sh"
