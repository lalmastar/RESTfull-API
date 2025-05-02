const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Local middlewares
const dbConnect = require('./config/dbConnect.js');
const {errorMiddleware} = require('./middlewares/error.js');
const userRoute = require('./routes/userRoute.js');
const removeUnverifiedAccounts = require('./automation/removeUnverifiedAccounts.js');

// Start the automation for removing unverified accounts
//removeUnverifiedAccounts(); 


dotenv.config();
const PORT = process.env.PORT || 8080;
dbConnect();
const app = express();
app.use(cors({
    origin: `${process.env.FRONTEND_URL}`, // React app URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use('/', (req,res) => {
//     res.send('Welcome to our new MERN Project!');
// });

app.use('/api/auth', userRoute);

app.use(errorMiddleware);

app.listen(PORT, () => {    
    console.log(`Server is running on port ${PORT}`);
});