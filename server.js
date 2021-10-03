const express = require('express');
const path = require('path');
const app = express();
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
app.use(express.urlencoded({extended : true}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'beomsutagram/build')));

let db;
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret: 'secret-code', resave: true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

const MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb+srv://bs3206:sbs32463206@cluster0.84vzi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', function(err, client){
    if(err){
        return console.log(err);
    }

    db = client.db('beomsutagram');
    app.listen(3000, ()=>{
        console.log('3000으로 접속완료');
    });
})

function isLogined(req, res, next){
    if(req.user){
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/write', isLogined, (req,res)=>{
    res.sendFile(path.join(__dirname, 'beomsutagram/build/index.html'));
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
//
app.get('*',function(req, res){
    res.sendFile(path.join(__dirname, 'beomsutagram/build/index.html'));
});

app.get('/isLogined', isLogined, function(req, res){
    res.send({state: true});
});

app.post('/register', function(req, res){
    const userData = {
        id: req.body.id,
        pw: req.body.pw,
        nickname: req.body.nickname
    }
    db.collection('user').findOne({id: userData.id}, function(err, result){
        if(result == null){
            db.collection('user').insertOne(userData, function(err, result){
                if(err) console.log(err);
                console.log('잘 전송됐습니다');
                res.redirect('/');
            });
        } else {
            console.log('이미 있는 아이디입니다.');
        }
    });
});

app.post('/login', passport.authenticate('local', {
    failureRedirect: '/fail'
}), (req, res)=>{
    res.redirect('/');
});

app.get('/mypage', isLogined, (req, res)=>{
    console.log(req.user);
});

app.post('/peed', isLogined, (req, res)=>{
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
    res.redirect('/');
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