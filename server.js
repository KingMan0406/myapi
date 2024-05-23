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

// Set up AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const DATA_FILE = path.join(__dirname, 'data.json');

// Ensure DATA_FILE exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

app.get('/api/products', (req, res) => {
    fs.readFile(DATA_FILE, (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading data' });
        }
        const products = JSON.parse(data);
        res.json(products);
    });
});

app.post('/api/products', upload.single('image'), (req, res) => {
    fs.readFile(DATA_FILE, (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading data' });
        }
        const products = JSON.parse(data);
        const newProduct = {
            id: products.length ? products[products.length - 1].id + 1 : 1,
            title: req.body.title,
            price: parseFloat(req.body.price),
            description: req.body.description,
            count: parseInt(req.body.count, 10),
        };

        if (req.file) {
            const params = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `${Date.now()}-${req.file.originalname}`,
                Body: req.file.buffer,
                ContentType: req.file.mimetype
            };

            s3.upload(params, (s3Err, data) => {
                if (s3Err) {
                    return res.status(500).json({ message: 'Error uploading image' });
                }
                newProduct.image = data.Location;
                products.push(newProduct);

                fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Error writing data' });
                    }
                    res.status(201).json(newProduct);
                });
            });
        } else {
            products.push(newProduct);
            fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Error writing data' });
                }
                res.status(201).json(newProduct);
            });
        }
    });
});

app.delete('/api/products/:id', (req, res) => {
    const productId = parseInt(req.params.id, 10);

    fs.readFile(DATA_FILE, (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading data' });
        }
        let products = JSON.parse(data);
        products = products.filter(product => product.id !== productId);

        fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error writing data' });
            }
            res.status(204).end();
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
