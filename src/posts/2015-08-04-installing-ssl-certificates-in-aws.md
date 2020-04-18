---
layout: post
title: Installing SSL certificates in Amazon Web Services
summary: How to install SSL Certificates in AWS to secure your sites.
date: 2015-08-04
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
heroImage:
  source: Unsplash
  id: 0Yiy0XajJHQ
---

I recently had to install an SSL certificate on a couple of load balancers in [Amazon Web Services][1] (AWS). The certificate was a [RapidSSL wildcard certificate][2]. To create the certificate, I needed to first generate a Certificate Signing Request. The request result was the content of a _pem_ file (the private key that needs to be kept secret), and the request itself. Once I had entered that request on the purchase site and had been authorized to create certificates for my domain, I was send a file package with three files in it:

- ServerCertificate.cer
- CACertificate-1.cer
- CACertificate-2.cer

Now I wanted to add the SSL certificate to AWS, but I got confused about what to enter where in the AWS Console. The dialog to add a certificate looks like this:

![](/images/2015-08-04-installing-ssl-certificates-in-aws/KX0UpBA.png "The dialog for adding an SSL certificate")

First, copy the content of the _pem_ file into the _Private Key_ field:

```
-----BEGIN RSA PRIVATE KEY-----
...A bunch of encoded information...
-----END RSA PRIVATE KEY-----
```

Then copy the content of the _ServerCertificate.cer_ file into the _Public Key Certificate_ field:

```
-----BEGIN CERTIFICATE-----
...A bunch of encoded information...
-----END CERTIFICATE-----
```

Finally, copy the content of the _CACertificate-1.cer_ and _CACertificate-2.cer_ files&#8212;in that order&#8212;into the _Certificate Chain_ field:

```
-----BEGIN CERTIFICATE-----
...A bunch of encoded information from CACertificate-1.cer...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
...A bunch of encoded information from CACertificate-2.cer...
-----END CERTIFICATE-----
```

And that is it! Save, apply, and you are good to go.

[1]: http://aws.amazon.com/
[2]: https://www.rapidssl.com/buy-ssl/wildcard-ssl-certificate/index.html
