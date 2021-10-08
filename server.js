const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const methodOverride = require('method-override');

const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({
    secret: 'secret-code',
    resave: true,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(cors());
app.use(express.static(path.join(__dirname, 'beomsutagram/build')));
app.use(methodOverride('_method'));
app.use(express.urlencoded({extended : true}));
app.use(express.json());

let db;
let multer = require('multer');
var storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, './public/image');
    },
    filename: function(req, file, cb){
        cb(null, file.originalname);
    },
    // filefilter: function(req, file, cb){
    //     var ext = path.extname(file.originalname);
    //     if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg'){
    //         return cb(new Error('PNG, JPG만 업로드하세요!'));
    //     }
    //     cb(null, true);
    // }
})

var upload = multer({storage: storage});



const MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb+srv://bs3206:sbs32463206@cluster0.84vzi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', function(err, client){
    if(err){
        return console.log(err);
    }

    db = client.db('beomsutagram');
    app.listen(8080, ()=>{
        console.log('8080으로 접속완료');
    });
})

// function isLogined(req, res, next){
//     if(req.user){
//         next();
//     } else {
//         res.redirect('http://localhost:3000/login');
//     }
// }

app.get('/write', (req,res)=>{
    //res.sendFile(path.join(__dirname, 'beomsutagram/build/index.html'));
});

app.get('/list', function(req, res){
    let data = {
        peedList: null,
        user: req.user,
    };
    db.collection('peed').find().toArray((err, result)=>{
        if(err) console.log(err);
        data.peedList = result.reverse();
        res.send({data});
    });
});

app.get('/isLogined',function(req, res){
    console.log(req);
    if(req.user === undefined || !req.user){
        res.send({state: false});
    } else {
        res.send({state: true});
    }
});

app.post('/register', function(req, res){
    const userData = {
        id: req.body.id,
        pw: req.body.pw,
        nickname: req.body.nickname
    }
    db.collection('user').findOne({id: userData.id}, function(err, result){
        if(result == null){
            db.collection('user').findOne({nickname: userData.nickname}, function(err, result){
                if(err) console.log(err);

                if(!result){
                    db.collection('user').insertOne(userData, function(err, result){
                        if(err) console.log(err);
                        console.log('잘 전송됐습니다');
                        res.redirect('http://localhost:3000/login');
                    });
                } else {
                    console.log('이미 있는 닉네임입니다.');
                }
            });
        } else {
            console.log('이미 있는 아이디입니다.');
        }
    });
});

app.post('/login', passport.authenticate('local', {
    failureRedirect: 'http://localhost:3000/fail'
}), (req, res)=>{
    res.redirect('http://localhost:3000/');
});

app.get('/mypage', (req, res)=>{
    console.log(req.user);
});

app.post('/peed', upload.array('imgFile', 5), (req, res)=>{
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hours = date.getHours();
    const minute = date.getMinutes();

    const peedData = {
        content: req.body.content,
        year,
        month: month + 1,
        day,
        hours,
        minute,
        author: req.user
    }
    db.collection('peed').insertOne(peedData, (err, result)=>{
        if(err) console.log(err);
    });
    res.redirect('http://localhost:3000/');
})

passport.use(new localStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
}, (input_id, input_pw, done)=>{
    console.log(input_id, input_pw);
    db.collection('user').findOne({id: input_id}, (err, result)=>{
        if(err) return done(err);
        if(!result) return done(null, false, {message: '존재하지 않는 아이디입니다.'});
        if(input_pw == result.pw){
            console.log('로그인 성공');
            return done(null, result);
        } else {
            return done(null, false, {message: '비밀번호가 틀렸습니다.'});
        }
    })
}));

passport.serializeUser((user, done)=>{
    done(null, user.id);
});

passport.deserializeUser((id, done)=>{
    db.collection('user').findOne({id}, (err, result)=>{
        done(null, result);
    })
})