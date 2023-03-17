/* 对 prevFuncData 参数的解释 */
/* [函数名, [函数已接受的参数]] */

/* 测试项目 */
// 1. addSource, addMutiSource 函数中表单的功能
// 2. getRssFeedFromURL 函数中的错误处理：能否跳转到正确的表单
// 

// 命令注册
mc.regPlayerCmd("rss", "获取 RSS Feeds", addSource);

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
const grayFont = "§7";

// 界面函数
function addSource(pl, label, inputedText, prevFuncData) {
    // label: 提示信息 | inputedText: 输入框中的文本
    let funcData = [Array.from(arguments), arguments.callee.name];

    if (valueNotProvided(label)) label = "";
    if (valueNotProvided(inputedText)) inputedText = "";

    let form = mc.newCustomForm()
        .setTitle("添加RSS源")    // testURL: https://www.minebbs.com/forums/-/index.rss
        .addInput("在下面文本框中输入RSS地址", "链接过长？输入§l0§r然后点击“提交”按钮来分段输入", inputedText) // id: 0
        .addLabel(label);

    pl.sendForm(form, (pl, data) => {
        if (data != null) {
            if (data[0] == "0") {
                selectInputCount(pl, funcData);
            } else {
                var rss;
                getRssFeedFromURL(pl, data[0], (rss) => {
                    addSource(pl, '成功添加: ' + rss.title, funcData[0][2], funcData);
                    // TODO: 保存到文件
                }, funcData);
            }
        } else {
            // todo: 玩家关闭了表单, 返回上一级
        }
    });
}

function selectInputCount(pl, prevFuncData) {
    let form = mc.newCustomForm()
        .setTitle("自定义输入框数量")
        .addSlider("输入框数量", 2, 20, 1, 1); // id: 0

    pl.sendForm(form, (pl, data) => {
        if (data != null) {
            addMutiSource(pl, "", data[0], "", prevFuncData);
        } else {
            // todo: 玩家关闭了表单, 返回上一级
        }
    });
}

function addMutiSource(pl, label, inputCount, inputedText, prevFuncData) {
    // label: 提示信息 | inputCount: 文本框数量 | inputedText: [数组]输入框中的文本
    let funcData = [Array.from(arguments), arguments.callee.name];

    if (valueNotProvided(label)) label = "";
    if (valueNotProvided(inputCount)) inputCount = 2;
    if (inputedText.length == 0) { // TOTEST: 是否能够正确判断inputedText
        inputedText = [];
        for (let i = 0; i < inputCount; i++) {
            inputedText[i] = "";
        }
    }

    let form = mc.newCustomForm()
        .setTitle("添加 RSS 源")
        .addLabel("请在下面的输入框中输入RSS地址，每个输入框最多输入§l100§r个字符。"); // id: 0

    for (let i = 0; i < inputCount; i++) {
        form.addInput(`${grayFont}[${i}]`, `第 ${i} 段`, inputedText[i]); // id: 1 ~ inputCount
    }

    form.addLabel(label);

    pl.sendForm(form, (pl, data) => {
        if (data != null) {
            let rss, url = "";
            for (let i = 1; i <= inputCount; i++) {
                url += data[i];
            }
            for (let i = 1; i <= inputCount; i++) {
                inputedText[i - 1] = data[i];
            }
            getRssFeedFromURL(pl, url, (rss) => {
                addMutiSource(pl, '成功添加: ' + rss.title, inputCount, inputedText, funcData);
            }, funcData);
        } else {
            // TODO: 玩家关闭了表单, 调用上一级函数
        }
    });
}

// 功能函数
async function getRssFeedFromURL(pl, url, callback, prevFuncData) { /* 从URL获取RSS Feed */
    try {
        pl.tell("正在访问 URL: " + url); // todo: 后面改成subtitle加载形式
        let rss = await parse(url);
        callback(rss);
    } catch (err) {
        // log(err);
        log(prevFuncData);
        if (prevFuncData[1] == "addSource") {
            addSource(pl, '获取 Rss Feed 时发生错误: ' + redFont + err.code, prevFuncData[0][2], prevFuncData);
        } else if (prevFuncData[1] == "addMutiSource") {
            addMutiSource(pl, '获取 Rss Feed 时发生错误: ' + redFont + err.code, prevFuncData[0][2], prevFuncData[0][3], prevFuncData);
        }
    }
}

function saveToFile(pl, rss) {
    const playerData = new JsonConfigFile(playerDataPath);

    // 如果key不存在则创建，否则获取并与现有的值比较，如果相同则不保存
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

function valueNotProvided(varible) { /* 判断值是否未提供 */
    return varible == null || varible == undefined || Array.isArray(varible);
}

// 创建计时器


// 销毁计时器
