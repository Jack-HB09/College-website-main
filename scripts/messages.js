
const parsedata = {
    "message": {
        "type": "info",
        "title": "notification",
        "content": "message",
        "duration": 3000,
    }
};

console.log(parsedata);
console.log(parsedata.message.type);    // info
console.log(parsedata.message.content); // message

function makeMessageTile(JSON_object) {

    const tile = document.createElement("div");
    tile.className = "message-tile";

    const img = document.createElement("img");

    const titleEl = document.createElement("h1");
    titleEl.className = "message-title";

    const contentEl = document.createElement("p");
    contentEl.className = "message-content";

    const TimerEl = document.createElement("div");
    TimerEl.className - "message-Timer"

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

    var Message = makeMessageTile()

    const tile = Message;
    switch (JSON_object.message.type) {
        case "info":
            colour = "#2196f3";
            break;

        case "success":
            colour = "#4caf50";
            break;

        case "warning":
            colour = "#ff9800";
            break;

        case "error":
            colour = "#f44336";
            break;

        default:
            colour = "#666";
    }

    tile.style.borderLeft = `6px solid ${colour}`;
    tile.style.borderBottom = `3px solid ${colour}`;

    MessageBox.appendChild(Message)
    Message.querySelector("p").innerText = JSON_object.message.content
    Message.querySelector("h1").innerText = JSON_object.message.title
    Message.querySelector("img").setAttribute("src", "images/messageicons/info.svg")
    Message.style.setProperty("--message-duration", JSON_object.message.duration)
    setTimeout(() => {

    }, JSON_object.message.duration
    )

}


makeMessage(parsedata)