FROM node:18-bullseye-slim

# install package
RUN apt update -qq && apt install -qq -y curl unzip

# aws cli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip && ./aws/install &&  rm awscliv2.zip

# cdk
RUN npm install -g aws-cdk