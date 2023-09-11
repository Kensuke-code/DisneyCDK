# DisneyCDK

## setup

- create .env

`touch .env`

- Inscribe AWS authentication information in the .env file

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION
```

-  build docker

`docker-compose build`

-  create cdk project

`docker-compose run --rm cdk cdk init app --language typescript`

- run cdk bootstrap

`docker-compose run --rm cdk cdk bootstrap`