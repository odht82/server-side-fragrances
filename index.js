const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient, ObjectID } = require('mongodb');

const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a0eve.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('fragrance_shop');
        const productsCollection = database.collection('products');
        const usersCollection = database.collection('users');
        const reviewsCollection = database.collection('reviews');
        const ordersCollection = database.collection('orders');

        app.get('/orders/own', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { orderer: email }
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.json(orders);
        })

        app.get('/orders', verifyToken, async (req, res) => {
            const cursor = ordersCollection.find({});
            const orders = await cursor.toArray();
            res.json(orders);
        })

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.json(result)
        })

        app.post('/products', verifyToken, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.json(result)
        })

        // DELETE ORDER ADMIN API
        app.delete('/orders/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) };
            const result = await ordersCollection.deleteOne(query);
            console.log('deleting order with id ', result);
            res.json(result);
        })

        // DELETE OWN ORDER API
        app.delete('/orders/own/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const id = req.query.id;
            const query = { _id: ObjectID(id) }
            const result = await ordersCollection.deleteOne(query);
            console.log('deleting order with id ', result);
            res.json(result);
        })

        // DELETE REVIEW API
        app.delete('/reviews/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) };
            const result = await reviewsCollection.deleteOne(query);
            console.log('deleting review with id ', result);
            res.json(result);
        })

        app.get('/products', verifyToken, async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.json(products);
        })

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.json(result)
        });

        app.get('/orders/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const order = await ordersCollection.findOne(query);
            let isShipped = false;
            if (order?.orderStatus === 'shipped') {
                isShipped = true;
                res.json({ sipping: isShipped });
            }
            else {
                isPending = true;
                res.json({ pending: isPending });
            }
        })

        app.put('/orders/shipped', verifyToken, async (req, res) => {
            const productId = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { productName: productId.productName, orderer: productId.email };
                    const updateDoc = { $set: { orderStatus: 'shipped' } };
                    const result = await ordersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make change' })
            }
        })

        app.put('/orders/pending', verifyToken, async (req, res) => {
            const productId = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { productName: productId.productName, orderer: productId.email };
                    const updateDoc = { $set: { orderStatus: 'pending' } };
                    const result = await ordersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make change' })
            }
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
                res.json({ admin: isAdmin });
            }
            else {
                isMember = true;
                res.json({ member: isMember });
            }
        })

        app.put('/users/member', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'member' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to update admin' })
            }
        })

        app.get('/users', verifyToken, async (req, res) => {
            const cursor = usersCollection.find({});
            const users = await cursor.toArray();
            res.json(users);
        })

        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.json(reviews);
        })

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.json(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })

    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Fragrance shop!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})




// DELETE API
// app.delete('/users/:id', async (req, res) => {
//     const id = req.params.id;
//     const query = { _id: ObjectId(id) };
//     const result = await usersCollection.deleteOne(query);

//     console.log('deleting user with id ', result);

//     res.json(result);
// })