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

// Set up AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const DATA_FILE = path.join(__dirname, 'users.json');

// Ensure DATA_FILE exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

app.get('/api/users', (req, res) => {
    fs.readFile(DATA_FILE, (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading data' });
        }
        const users = JSON.parse(data);
        res.json(users);
    });
});

app.post('/api/users', (req, res) => {
    fs.readFile(DATA_FILE, (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading data' });
        }
        const users = JSON.parse(data);
        const newUser = {
            id: users.length ? users[users.length - 1].id + 1 : 1,
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

        if (req.file) {
            const params = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: `${Date.now()}-${req.file.originalname}`,
                Body: req.file.buffer,
                ContentType: req.file.mimetype
            };

            console.log('Uploading to S3 with params:', params);

            s3.upload(params, (s3Err, data) => {
                if (s3Err) {
                    console.error('Error uploading to S3:', s3Err);
                    return res.status(500).json({ message: 'Error uploading image' });
                }
                newUser.image = data.Location;
                users.push(newUser);

                fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), (err) => {
                    if (err) {
                        console.error('Error writing data:', err);
                        return res.status(500).json({ message: 'Error writing data' });
                    }
                    res.status(201).json(newUser);
                });
            });
        } else {
            users.push(newUser);
            fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Error writing data' });
                }
                res.status(201).json(newUser);
            });
        }
    });
});

app.delete('/api/users/:id', (req, res) => {
    const userId = parseInt(req.params.id, 10);

    fs.readFile(DATA_FILE, (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading data' });
        }
        let users = JSON.parse(data);
        users = users.filter(user => user.id !== userId);

        fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), (err) => {
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
