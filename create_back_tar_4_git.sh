#!/bin/bash
rm back.git.tar.gz && tar --exclude='./back.git.tar.gz' --exclude='./client' --exclude='./knexfile.js' --exclude='./nginx.*' --exclude='./node_modules' --exclude='./public' --exclude='./.well-known' -czvf back.git.tar.gz .
