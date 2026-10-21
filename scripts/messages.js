const testMessages = [
    {
        message: {
            type: "info",
            title: "Information",
            content: "This is a test information message.",
            duration: 3000,
        }
    },
    {
        message: {
            type: "success",
            title: "Success",
            content: "This is a test success message.",
            duration: 3000,
        }
    },
    {
        message: {
            type: "warning",
            title: "Warning",
            content: "This is a test warning message.",
            duration: 3000,
        }
    },
    {
        message: {
            type: "error",
            title: "Error",
            content: "This is a test error message.",
            duration: 3000,
        }
    }
];

function makeMessageTile() {

    const tile = document.createElement("div");
    tile.className = "message-tile";

    const img = document.createElement("img");

    const titleEl = document.createElement("h1");
    titleEl.className = "message-title";

    const contentEl = document.createElement("p");
    contentEl.className = "message-content";

    const TimerEl = document.createElement("div");
    TimerEl.className = "message-Timer";

    const textContainer = document.createElement("div");
    textContainer.className = "message-text";

    textContainer.appendChild(titleEl);
    textContainer.appendChild(contentEl);
    tile.appendChild(img);
    tile.appendChild(textContainer);
    tile.appendChild(TimerEl);

    console.log(tile)

    return tile;
}

function makeMessage(JSON_object) {
    const MessageBox = document.getElementById("message");

    const Message = makeMessageTile();

    const tile = Message;
    let colour = "#666";
    let imgpath = "images/messageicons/info.svg";
    switch (JSON_object.message.type) {
        case "info":
            colour = "#2196f3";
            imgpath = "images/messageicons/info.svg"
            break;

        case "success":
            colour = "#4caf50";
            imgpath = "images/messageicons/success.svg"
            break;

        case "warning":
            colour = "#ff9800";
            imgpath = "images/messageicons/warning.svg"
            break;

        case "error":
            colour = "#f44336";
            imgpath = "images/messageicons/error.svg"
            break;

        default:
            colour = "#666";
    }
    tile.style.setProperty("--message-color", colour);
    Message.querySelector("p").innerText = JSON_object.message.content
    Message.querySelector("h1").innerText = JSON_object.message.title
    Message.querySelector("img").setAttribute("src", imgpath)
    const duration = JSON_object.message.duration ?? 3000;
    Message.style.setProperty("--message-duration", `${duration}ms`);
    Message.querySelector(".message-Timer").style.backgroundColor = colour;
    MessageBox.appendChild(Message);
    setTimeout(() => Message.remove(), duration);
}


testMessages.forEach(makeMessage);