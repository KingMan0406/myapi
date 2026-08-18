require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AWS = require('aws-sdk');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// =========================
// AWS S3
// =========================

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// =========================
// DATA FILES
// =========================

const USERS_FILE = path.join(__dirname, 'users.json');
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify([], null, 2)
    );
}

if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(
        PRODUCTS_FILE,
        JSON.stringify([], null, 2)
    );
}


// ========================================
// USERS API
// ========================================

// GET users
app.get('/api/users', (req, res) => {

    fs.readFile(USERS_FILE, 'utf8', (err, data) => {

        if (err) {
            return res.status(500).json({
                message: 'Error reading users'
            });
        }

        try {
            const users = JSON.parse(data);
            res.json(users);
        } catch (error) {
            res.status(500).json({
                message: 'Invalid users data'
            });
        }
    });
});


// POST user
app.post('/api/users', (req, res) => {

    fs.readFile(USERS_FILE, 'utf8', (err, data) => {

        if (err) {
            return res.status(500).json({
                message: 'Error reading users'
            });
        }

        let users;

        try {
            users = JSON.parse(data);
        } catch (error) {
            return res.status(500).json({
                message: 'Invalid users data'
            });
        }

        const newUser = {

            id: users.length
                ? Math.max(...users.map(user => user.id)) + 1
                : 1,

            name: req.body.name,
            surname: req.body.surname,
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            position: req.body.position,
            image: req.body.image,
            is_logged: req.body.is_logged,
            money: req.body.money
        };

        users.push(newUser);

        fs.writeFile(
            USERS_FILE,
            JSON.stringify(users, null, 2),
            err => {

                if (err) {
                    return res.status(500).json({
                        message: 'Error writing users'
                    });
                }

                res.status(201).json(newUser);
            }
        );
    });
});


// DELETE user
app.delete('/api/users/:id', (req, res) => {

    const userId = parseInt(req.params.id, 10);

    fs.readFile(USERS_FILE, 'utf8', (err, data) => {

        if (err) {
            return res.status(500).json({
                message: 'Error reading users'
            });
        }

        let users;

        try {
            users = JSON.parse(data);
        } catch (error) {
            return res.status(500).json({
                message: 'Invalid users data'
            });
        }

        users = users.filter(
            user => user.id !== userId
        );

        fs.writeFile(
            USERS_FILE,
            JSON.stringify(users, null, 2),
            err => {

                if (err) {
                    return res.status(500).json({
                        message: 'Error writing users'
                    });
                }

                res.status(204).end();
            }
        );
    });
});


// ========================================
// PRODUCTS API
// ========================================

// GET products
app.get('/api/products', (req, res) => {

    fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {

        if (err) {
            console.error('Error reading products:', err);

            return res.status(500).json({
                message: 'Error reading products'
            });
        }

        try {

            const products = JSON.parse(data);

            res.json(products);

        } catch (error) {

            console.error(
                'Invalid products.json:',
                error
            );

            res.status(500).json({
                message: 'Invalid products data'
            });
        }
    });
});


// POST product
app.post(
    '/api/products',
    upload.single('image'),
    (req, res) => {

        fs.readFile(
            PRODUCTS_FILE,
            'utf8',
            (err, data) => {

                if (err) {
                    return res.status(500).json({
                        message: 'Error reading products'
                    });
                }

                let products;

                try {
                    products = JSON.parse(data);
                } catch (error) {

                    return res.status(500).json({
                        message: 'Invalid products data'
                    });
                }


                const newProduct = {

                    id: products.length > 0
                        ? Math.max(
                            ...products.map(
                                product => product.id
                            )
                        ) + 1
                        : 1,

                    title: req.body.title,

                    price:
                        Number(req.body.price),

                    description:
                        req.body.description,

                    image: "",

                    count:
                        Number(req.body.count || 0)
                };


                const saveProduct = () => {

                    products.push(newProduct);

                    fs.writeFile(
                        PRODUCTS_FILE,
                        JSON.stringify(
                            products,
                            null,
                            2
                        ),
                        err => {

                            if (err) {

                                return res
                                    .status(500)
                                    .json({
                                        message:
                                            'Error writing products'
                                    });
                            }

                            res
                                .status(201)
                                .json(newProduct);
                        }
                    );
                };


                if (req.file) {

                    const params = {

                        Bucket:
                            process.env
                                .S3_BUCKET_NAME,

                        Key:
                            `products/${Date.now()}-${req.file.originalname}`,

                        Body:
                            req.file.buffer,

                        ContentType:
                            req.file.mimetype
                    };


                    s3.upload(
                        params,
                        (s3Err, uploadData) => {

                            if (s3Err) {

                                console.error(
                                    'Error uploading product image:',
                                    s3Err
                                );

                                return res
                                    .status(500)
                                    .json({
                                        message:
                                            'Error uploading image'
                                    });
                            }

                            newProduct.image =
                                uploadData.Location;

                            saveProduct();
                        }
                    );

                } else {

                    saveProduct();
                }
            }
        );
    }
);


// DELETE product
app.delete('/api/products/:id', (req, res) => {

    const productId =
        parseInt(req.params.id, 10);

    fs.readFile(
        PRODUCTS_FILE,
        'utf8',
        (err, data) => {

            if (err) {

                return res.status(500).json({
                    message:
                        'Error reading products'
                });
            }

            let products;

            try {

                products =
                    JSON.parse(data);

            } catch (error) {

                return res.status(500).json({
                    message:
                        'Invalid products data'
                });
            }


            const productExists =
                products.some(
                    product =>
                        product.id === productId
                );


            if (!productExists) {

                return res.status(404).json({
                    message:
                        'Product not found'
                });
            }


            products =
                products.filter(
                    product =>
                        product.id !== productId
                );


            fs.writeFile(
                PRODUCTS_FILE,
                JSON.stringify(
                    products,
                    null,
                    2
                ),
                err => {

                    if (err) {

                        return res
                            .status(500)
                            .json({
                                message:
                                    'Error writing products'
                            });
                    }

                    res.status(204).end();
                }
            );
        }
    );
});


// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
    console.log(
        `Server is running on port ${PORT}`
    );
});
