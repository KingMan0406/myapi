const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const DATA_FILE = path.join(__dirname, 'data.json');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

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
        const newProduct = req.body;
        newProduct.id = products.length ? products[products.length - 1].id + 1 : 1;
        if (req.file) {
            newProduct.image = `http://localhost:${PORT}/uploads/${req.file.filename}`;
        }
        products.push(newProduct);

        fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error writing data' });
            }
            res.status(201).json(newProduct);
        });
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
