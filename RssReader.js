// 命令注册
mc.regPlayerCmd("rss", "获取 RSS Feeds",);

// 常量
const { parse } = require('rss-to-json');
const playerDataPath = "plugins/RssReader/playerData.json";
const elementName = {
    title: "标题",
    description: "描述",
    created: "创建时间",
    published: "发布时间",
    link: "链接",
    content: "内容",
    category: "分类",
    enclosures: "附件",
    media: "媒体",
    id: "ID",
    author: "作者"
};
const labelFormat = "************%%************";
const defaultIndent = 3;
const redFont = "§c";
const greenFont = "§a";

// 界面函数
function addSource(pl, text, prevFunc) {
    if (text == null) text = "";

    let form = mc.newCustomForm()
        .setTitle("添加RSS源")
        .addInput("在下面文本中输入RSS地址") // id: 0
        .addLabel(text);

    pl.sendForm(form, (pl, data) => {
        if (data != null) {
            var rss;
            getRssFeedFromURL(data[0], (rss) => {
                addSource(pl, '成功' + greenFont + code);
            });
        } else {
            // todo: 玩家关闭了表单, 返回上一级
        }
    });
}

// 功能函数
async function getRssFeedFromURL(pl, url, callback, prevFunc) { /* 从URL获取RSS Feed */
    try {
        rss = await parse(url);
        callback(rss);
    } catch (err) {
        addSource(pl, '获取 Rss Feed 时发生错误: ' + redFont + code);
    }
}

function replaceBetweenPercentSigns(str1, str2) { /* 替换字符串中所有百分号之间的内容 */
    return str1.replace(/%.*?%/g, str2);
}

function timestampToLocalString(timestamp) { /* 时间戳转换为本地时间并格式化输出 */
    // 创建一个Date对象
    let date = new Date(timestamp);
    // 获取本地日期字符串
    let dateString = date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    // 获取本地时间字符串
    let timeString = date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
    // 拼接并返回结果
    return dateString + " " + timeString;
}

function arr2str(arr) { /* 将数组转换为字符串 */
    var string = arr.join(", "); // 使用join方法，用逗号和空格来分隔元素
    return string;
}

function printObject(obj, indent) { /* 打印对象 */
    if (indent == null) indent = defaultIndent;
    // 遍历对象的所有属性
    for (let key in obj) {
        if (typeof obj[key] === "object") {
            // 如果元素是一个对象，调用printObject函数输出对象内键和键对应的值
            printObject(obj[key]);
        } else if (Array.isArray()) {
            // 如果元素是一个数组，调用printArray函数输出数组内所有值
            printArray(obj[key]);
        } else if (obj.hasOwnProperty(key)) { // 如果属性是自身的（不是继承的）
            // 打印属性名和属性值，用方括号和冒号分隔
            console.log(" ".repeat(indent) + "[" + key + "] " + obj[key]);
        }
    }
}

function printArray(array) { /* 打印数组 */
    // 遍历数组的所有元素
    for (let element of array) {
        if (typeof element === "object") {
            // 如果元素是一个对象，调用printObject函数输出对象内键和键对应的值
            printObject(element);
        } else if (Array.isArray()) {
            // 如果元素是一个数组，调用printArray函数输出数组内所有值
            printArray(element);
        } else {
            // 否则，直接打印元素值
            console.log(element);
        }
    }
}

function printObjectKeyAndType(obj) { /* 打印对象的键和键对应的值的类型 */
    for (let key in obj) {
        let type = typeof obj[key];
        if (type === "object") {
            if (Array.isArray(obj[key])) {
                type = "array";
            } else if (obj[key] === null) {
                type = "null";
            }
        }
        console.log(key + ": " + type);
    }
}