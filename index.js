const express = require('express');
const app=express();
const cors = require('cors');
require('dotenv').config()
const stripe=require('stripe')(process.env.ACCESS_SECRET)
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
//middleware
app.use(cors());
app.use(express.json());

const verifyJWT=(req,res,next)=>{

  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
// bearer token
const token = authorization.split(' ')[1];
jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
  if (err) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  req.decoded = decoded;
  next();
})

}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.brc1eh6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
   

//all collection
 const classCollection = client.db("languageclassDb").collection("class");
 const selectedclassCollection = client.db("languageclassDb").collection("selectedclass");
 const enrolledclassCollection = client.db("languageclassDb").collection("enrolledclass");
 const paymentCollection = client.db("languageclassDb").collection("payment");
 const instructorCollection = client.db("languageclassDb").collection("instructor");
 const usersCollection = client.db("languageclassDb").collection("users");




 //crud opertaion
 //JWT
 app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '7d' })

  res.send({ token })
})

//admin verify
// const verifyAdmin = async (req, res, next) => {
//   const email = req.decoded.email;
//   const query = { email: email }
//   const user = await usersCollection.findOne(query);
//   if (user?.role !== 'admin') {
//     return res.status(403).send({ error: true, message: 'forbidden message' });
//   }
//   next();
//}
// //instructor verify
// const verifyInstructor = async (req, res, next) => {
//   const email = req.decoded.email;
//   const query = { email: email }
//   const user = await usersCollection.findOne(query);
//   if (user?.role !== 'instructor') {
//     return res.status(403).send({ error: true, message: 'forbidden message' });
//   }
//   next();
// }

  
   //Get all classes
    app.get('/class', async (req, res) => {
      const result = await classCollection.find().toArray();
      
      res.send(result);
    });


    //popular class 
    app.get('/popularclasses', async (req, res) => {
      const result = await classCollection.find({ status: "approved" })
        .sort({ availableSeats: -1 })
        .limit(6)
        .toArray();
    
      res.send(result);
    });
    


    app.get('/instructor', async (req, res) => {
      const result = await usersCollection.find({role:"instructor"}).toArray();
      
      res.send(result);
    });

    //approve classs
    app.get('/approveclass', async (req, res) => {
      const result = await classCollection.find({status:
        "approved"}).toArray();
      
      res.send(result);
    });


    app.get('/instrucor', async (req, res) => {
      const result = await classCollection.find({role:
        "approved"}).toArray();
      
      res.send(result);
    });

   
    

    // Approve a class
    app.patch('/class/:id/approve', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: 'approved' } };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Deny a class
    app.patch('/class/:id/deny', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: 'denied' } };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    // Send feedback for a specific class
app.patch('/class/:id/feedback', async (req, res) => {
  const classId = req.params.id;
  const { feedback } = req.body;

  // Update the class document with the feedback
  const filter = { _id: new ObjectId(classId) };
  const updateDoc = {
    $set: { feedback }
  };

  const result = await classCollection.updateOne(filter, updateDoc);

  res.send(result);
});



//student selected class

    // Student Dashboard: Select a class for a student
app.get('/selectedclass/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email: email };

  const result = await selectedclassCollection.find(query).toArray();
  res.send(result);
});

app.post('/selectedclass/:email', async (req, res) => {
  const {image,instructorName,instructorEmail,availableSeats,price,status} = req.body;
  //console.log(user);
  // const query = { email: user.email };
  // 
  const data = {image,instructorName,instructorEmail,availableSeats,price,status,email:req.params.email}
  console.log(data);
  const result = await selectedclassCollection.insertOne(data);
  res.send(result);
});

app.delete("/selectedclass/:email", async (req, res) => {
  console.log("id ");
  const email = req.params.email;
 

  const query = { email: email, };

  const result = await selectedclassCollection.deleteOne(query);
  res.send(result);
});


// Student Dashboard: Pay for a selected class
app.post('/payment/:id', async (req, res) => {
  const classId = req.params.classId;
    
 const result= await classCollection.updateOne({ _id: classId }, { $inc: { availableSeats: -1 } });
req.send(result);
})

//payment api
app.post('/payment', async (req, res) => {
  const payment = req.body;
  console.log(req.body);

  const deleteResult = await selectedclassCollection.deleteOne({ _id: new ObjectId(classId) });

  const insertResult = await paymentCollection.insertOne(payment);

  res.send({ deleteResult, insertResult });
});


// create payment intent
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

// Student Dashboard: Get payment history
app.get('/payment-history/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email: email };

  const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
  res.send(result);
});


// Student Dashboard: Save payment history
app.post('/payment/history', async (req, res) => {
 
    const paymentData = req.body;
    
    const result = await paymentCollection.insertOne(paymentData);
    res.send(result);
  })

  // Student Dashboard: Get enrolled classes
app.get('/enrolledclasses/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  

  const enrolledClasses = await enrolledclassCollection.find(query).toArray();
  console.log(enrolledClasses);
  res.send(enrolledClasses);
});

// Student Dashboard: Add enrolled class
app.post('/enrolledclasses/:email', async (req, res) => {
  const { email, classId, className, instructorName, price } = req.body;
  ;
 console.log(req.body);

  const enrolledClass = {
    email,
    classId,
    className,
    instructorName,
    price,
    paymentDate: new Date(),
  };

  const result = await enrolledclassCollection.insertOne(enrolledClass);
  res.send(result);
});








//select class
  // cart collection apis
  app.get('/classes', verifyJWT, async (req, res) => {
    const email = req.query.email;

    if (!email) {
      res.send([]);
    }

    const decodedEmail = req.decoded.email;
    if (email !== decodedEmail) {
      return res.status(403).send({ error: true, message: 'forbidden access' })
    }

    const query = { email: email };
    const result = await selectedclassCollection.find(query).toArray();
    res.send(result);
  });

  app.post('/classes', async (req, res) => {
    const item = req.body;
    const result = await selectedclassCollection.insertOne(item);
    res.send(result);
  })






// all users 
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

   
    //admin check
    app.get('/users/admin/:email',  async (req, res) => {
      const email = req.params.email;

      // if (req.decoded.email !== email) {
      //   res.send({ admin: false })
      // }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })
    //admin update
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })


    //instructor  check
  
    app.get('/users/instructor/:email',  async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' };
      res.send(result);
      
    });

    //instructor Update
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })


    //instructor class 
    app.get('/myclasses', verifyJWT, async (req, res) => {
      const instructorEmail = req.decoded.email;
    const classes = await classCollection.find({ instructorEmail }).toArray();
    res.json(classes);
      
    });


    //class ad by instructor 



    app.post('/addclass', async (req, res) => {
  const classData = req.body;
  classData.status = 'pending';
 const result = await classCollection.insertOne(classData);
    res.send(result);
    });












    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req,res)=>{
    res.send('server is running')
})
app.listen(port,()=>{
    console.log(`server run on ${port}`);
})