const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const path = require("path");
const cookieParser = require('cookie-parser');
const SqliteDataAccess = require('./database/db');
const Messages = require('./models/messages');
require('dotenv').config();

const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, process.env.PRIVATE_KEY), process.env.ENCODING),
    cert: fs.readFileSync(path.join(__dirname, process.env.CERTIFICATE_CRT), process.env.ENCODING),
};

// Creating the Express server
const app = express();

// Server configuration
app.use(cookieParser());
app.set("view engine", process.env.VIEW_ENGINE);
app.set("views", path.join(__dirname, "views"));
app.use("/static", express.static(path.join(__dirname, process.env.FOLDER_PUBLIC)));
app.get(
    process.env.PKI_VALIDATION_PATH,
    function (req, res, next) {
        res.send(process.env.PKI_VALIDATION_CONTENT);
    }
);
app.use(express.urlencoded({ extended: false }));

// Starting the server
http.createServer(function (req, res) {
    res.writeHead(301, {
        Location: "https://" + req.headers["host"] + req.url,
    });
    res.end();
}).listen(process.env.HTTP_PORT);
const httpsServer = https.createServer(httpsOptions, app);
const io = require("socket.io").listen(httpsServer);
httpsServer.listen(process.env.HTTPS_PORT, process.env.HOSTNAME, () => {
    console.log("Server started.");
});

// Database
const db = new SqliteDataAccess(path.join(__dirname, process.env.DATABASE_PATH));
const messages = new Messages(db);

// index page
app.get("/", async (req, res) => {
    try {
        let promises = [messages.getCount(), messages.getList(process.env.WISHES, process.env.WISHES_TOP)], listWishes = [], wishesReceived = 0, loveitReceived = 0, messageId = 0;
        if (typeof req.cookies[process.env.COOKIE_NAME] === 'undefined') {
            const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            res.cookie(process.env.COOKIE_NAME, randomId, { domain: process.env.HOSTNAME, httpOnly: true, secure: true, maxAge: process.env.COOKIE_EXPIRED });
        } else {
            promises.push(messages.getById({ messageTypeId: process.env.LOVEIT, userId: req.cookies[process.env.COOKIE_NAME] }));
        }
        let [result1, result2, result3] = await Promise.all(promises);
        if (result1.length > 0) {
            result1.forEach(element => {
                if (element.MessageTypeId == process.env.WISHES) {
                    wishesReceived = element.Total;
                } else if (element.MessageTypeId == process.env.LOVEIT) {
                    loveitReceived = element.Total;
                }
            });
        }
        listWishes = result2;
        if (typeof result3 !== 'undefined') {
            messageId = result3.MessageId;
        }
        res.render("pages/index", {
            messageId: messageId,
            wishesReceived: wishesReceived,
            loveitReceived: loveitReceived,
            listWishes: listWishes,
        });
    } catch (e) {
        console.error(e.message);
    }
});

app.get("/*", (req, res) => {
    res.sendStatus(400);
});

io.on("connection", async (socket) => {
    socket.on("create wishes", async (data) => {
        if (typeof data.id != 'undefined') {
            try {
                let resultVar = await messages.create(process.env.WISHES, data.fullName, data.messageContent, data.id, process.env.APPROVED_REVIEWSTATUS);
                if (resultVar) {
                    io.emit("refresh wishes", data);
                }
            } catch (e) {
                console.error(e.message);
            }
        }
    });
    socket.on("create loveit", async (data) => {
        if (typeof data.id != 'undefined') {
            try {
                let resultVar = await messages.create(process.env.LOVEIT, null, null, data.id, process.env.APPROVED_REVIEWSTATUS);
                if (resultVar) {
                    if (data.count <= 0) {
                        data.text = 'Bạn đã thích'
                    } else {
                        data.text = 'Bạn và ' + data.count + ' người khác đã thích câu chuyện này.';
                    }
                    data.count++;
                    data.completed = true;
                    io.emit("refresh loveit", data);
                }
            } catch (e) {
                console.error(e.message);
            }
        }
    });
});