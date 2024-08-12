require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000; // Use port from environment variables or default to 5000

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// File where properties will be stored
const propertiesFilePath = path.join(__dirname, 'properties.json');

// Function to load properties from JSON file
const loadProperties = () => {
  try {
    if (fs.existsSync(propertiesFilePath)) {
      const data = fs.readFileSync(propertiesFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading properties file:', error);
  }
  return [];
};

// Function to save properties to JSON file
const saveProperties = (properties) => {
  try {
    fs.writeFileSync(propertiesFilePath, JSON.stringify(properties, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing properties file:', error);
  }
};

// Load properties from file when server starts
let properties = loadProperties();

// Routes
app.post('/properties', upload.single('image'), (req, res) => {
  const { name, price, location, sqft } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : '';

  const newProperty = {
    id: properties.length + 1,
    name,
    price,
    location,
    sqft,
    image,
  };

  properties.push(newProperty);
  saveProperties(properties); // Save to JSON file
  res.status(201).json(newProperty);
});

app.get('/properties', (req, res) => {
  res.json(properties);
});

// DELETE route to handle property deletion
app.delete('/properties/:id', (req, res) => {
  const { id } = req.params;
  const propertyIndex = properties.findIndex(property => property.id === parseInt(id));

  if (propertyIndex === -1) {
    return res.status(404).json({ message: 'Property not found' });
  }

  // Remove the image file from the uploads directory
  const property = properties[propertyIndex];
  if (property.image) {
    try {
      fs.unlinkSync(path.join(__dirname, property.image));
    } catch (error) {
      console.error('Error deleting image file:', error);
    }
  }

  // Remove the property from the array
  properties.splice(propertyIndex, 1);
  saveProperties(properties); // Save updated list to JSON file
  res.status(200).json({ message: 'Property deleted successfully' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
