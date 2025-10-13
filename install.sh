#!/bin/bash

echo "Installing TSEF..."

sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install git -y

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

git clone https://github.com/forepath/devkit.git devkit
cd devkit
nvm install
nvm use
npm install -g nx
npm install
nx reset

echo "TSEF installed successfully!"
