#!/bin/bash
set -e

node --version | grep 16 || { echo "Please use node 16"; false; }
