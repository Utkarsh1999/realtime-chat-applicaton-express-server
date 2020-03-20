const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');

const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
} = require('./users.js');

const PORT = process.env.PORT || 5000;

const router = require('./router');

const app = express();
app.use(router);
app.use(cors());
const server = http.createServer(app);
const io = socketio(server);

io.on('connection',(socket)=>{
    socket.on('join', ({name,room}, callback)=>{
        const {error, user} = addUser({id: socket.id,name,room});
        // console.log("error: ",error,user);
        if(error) return callback(error);
        //we emitted event from backend to frontend, also these are admin generated messages
        socket.emit('message',{
            user:'admin',
            text:`${name}, welcome to the room ${room}`
        });
        
        socket.broadcast.to(room).emit('message',{
            user:'admin',
            text:`${name}, has joined`
        });

        socket.join(room);
        io.to(room).emit('roomdata', {room: room, users: getUsersInRoom(room)})

        callback();
    });

    //here, we're expecting event and these messages are user generated
    socket.on('sendMessage',(message,callback) => {
        const user = getUser(socket.id);
        console.log("user = ",user);
        io.to(user.room).emit('message',{user: user.name, text: message});
        io.to(user.room).emit('roomData',{room: user.room, users: getUsersInRoom(user.room)});
        callback();

    });

    socket.on('disconnect',() => {
        const user = removeUser(socket.id);
        if(user){
            io.to(user.room).emit('message',{user:'admin', text: `${user.name} has left.`})
            console.log("users in room : ",getUsersInRoom(user.room));
        }
        console.log("user had left!!!");
        
    });

});



server.listen(PORT,()=> console.log(`Server has started on port ${PORT}`));