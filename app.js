var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var path = require('path');
var mysql = require('mysql');

app.listen(80);



function handler(req, res) {
    fs.readFile(__dirname + '/index.html',
        function(err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            let type = 'text/html';
            console.log(path.extname(req.url))
            if (path.extname(req.url) == '.jpg') {
                type = 'image/jpeg';
            }
            res.setHeader('Content-Type', type);
            res.writeHead(200);
            res.end(data);
        });
}




function handleDisconnect() {
    var mysqlconnection;
    // Recreate the connection, since
    // the old one cannot be reused.
    mysqlconnection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '1234',
        database: 'test'
    });

    mysqlconnection.connect(function(err) {
        // The server is either down
        // or restarting
        if (err) {
            // We introduce a delay before attempting to reconnect,
            // to avoid a hot loop, and to allow our node script to
            // process asynchronous requests in the meantime.
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000);
        }
    });
    mysqlconnection.on('error', function(err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        } else {
            throw err;
        }
    });
    mysocketevent(mysqlconnection);
}



handleDisconnect();









function mysocketevent(mysqlconnection) {
    console.log('启动socket服务');
    // 登录

    io.on('connection', function(socket) {
        socket.on('login', function(data) {
            var ql = `select * from test.user where uid = '${data.account}' and password = '${data.password}'`;
            console.log(ql);
            mysqlconnection.query(ql, function(error, results, fields) {
                // console.log(results);
                // console.log(results.length);
                if (error) {
                    console.log(error)
                } else {
                    if (results.length == 0) {
                        socket.emit('login_return', { res: false });
                    } else {
                        console.log('成功登录')
                        socket.emit('login_return', { res: true });
                    }
                }


            })
        });



    });


    // 注册

    io.on('connection', function(socket) {
        socket.on('reg', function(data) {
            // var ql = `select * from test.user where username = '${data.account}' and password = '${data.password}'`;
            var ql = `insert into test.user values ('${data.account}','${data.password}','${data.company}')`
                // console.log(ql);
            mysqlconnection.query(ql, function(error, results, fields) {
                // console.log('完成');
                socket.emit('login_return', { res: '完成' });
            })
        })
    });


    // 获取我发起的会议列表

    io.on('connection', function(socket) {
        socket.on('getMeeting', function(data) {
            // console.log(data);
            // var ql = `select * from test.user where username = '${data.account}' and password = '${data.password}'`;
            var ql = `select * from test.meeting where uid='${data}'`
                // console.log(ql);
            mysqlconnection.query(ql, function(error, results, fields) {
                // console.log('完成');
                // console.log(results[0])
                for (var i in results) {
                    // console.log(results['1'])
                    // console.log(results[i].uid);
                }
                socket.emit('getMeeting_return', results);

            });
        })
    });


    //  添加会议
    io.on('connection', function(socket) {
        socket.on('addmeet', function(data) {

            // 获取 comp
            // var comp;
            var mql = `select comp from test.user where uid='${data.uid}'`;

            mysqlconnection.query(mql, function(error, results, fields) {
                // comp = results.comp;
                // console.log('公司', results[0].comp);
                var compan;
                for (var i in results) {
                    compan = results[i].comp;
                }
                var mytime = new Date(data.st).Format("yyyy-MM-dd hh:mm:ss");

                // console.log(results[0].comp);
                // var ql = `select * from test.user where username = '${data.account}' and password = '${data.password}'`;
                var ql = `insert into test.meeting (uid,name,des,comp,st) values ('${data.uid}' ,'${data.mname}' , '${data.des}','${compan}','${mytime}')`;
                // console.log(ql);
                var mid;
                mysqlconnection.query(ql, function(error, results, fields) {
                    // console.log(results);
                    mid = results.insertId;
                    var uidlist = data.arr;
                    for (var i = 0; i < uidlist.length; i++) {

                        var insertsql = `insert into test.attebd (mid,uid) values ('${mid}' ,'${uidlist[i]}')`;
                        // console.log(insertsql)
                        mysqlconnection.query(insertsql, function(error, results, fields) {
                            // console.log(error)
                        });
                    }
                    console.log('添加完成');
                });

                // 循环 插入


            })
        })
    });


    // 获取同一公司成员

    io.on('connection', function(socket) {

        socket.on('getuid', function(data) {
            var mql = `select comp from test.user where uid='${data}'`;

            mysqlconnection.query(mql, function(error, results, fields) {
                // 获取comp
                var ql;
                for (var t in results) {
                    ql = `select uid from test.user where comp='${results[t].comp}'`;
                }
                // console.log(ql)
                mysqlconnection.query(ql, function(error, myresults, fields) {
                    // 获取uid
                    var uidlist = [];
                    for (var i in myresults) {
                        // console.log(myresults)
                        uidlist.push(myresults[i].uid);
                    }
                    // console.log(uidlist);
                    socket.emit('getuid_return', { list: uidlist });
                })
            })

            // socket.emit('news', { server: username });
        });
    });

    // 签到
    // 扫描 二维码  获得 mid  连同 uid 传给 后台 后台执行 update
    //update test.attebd set at=now()  where mid=${} and uid=${}
    io.on('connection', function(socket) {
        socket.on('signin', function(data) {
            // 
            var queryl = `select * from test.attebd where mid=${data.mid} and uid='${data.uid}'`;
            mysqlconnection.query(queryl, function(error, result) {
                if (error != null) {
                    console.log(error)

                } else {
                    if (result.length > 0) {
                        var ql = `update test.attebd set at=now() where mid=${data.mid} and uid='${data.uid}'`;
                        console.log(ql)
                        mysqlconnection.query(ql, function(error, result) {

                            if (error != null) {
                                console.log(error)
                            } else {
                                console.log('扫码正确')
                                var sql = `select * from test.meeting where mid=${data.mid}`
                                mysqlconnection.query(sql, function(error, results, fields) {
                                    for (var z in results) {
                                        var infojson = {
                                            mname: results[z].name,
                                            des: results[z].des,
                                            st: results[z].st,
                                            err: 0
                                        }
                                        socket.emit('signin_return', infojson);
                                    }
                                })
                            }

                        });


                    } else {
                        console.log('扫码错误')
                            // console.log(result);
                        socket.emit('signin_return', { err: 1 });
                        //             

                    }
                    //     })
                }



            });
            // 返回什么  会议名称  会议简介  会议签到时间




        });
    });


    // 删除会议
    io.on('connection', function(socket) {
        socket.on('delmeeting', function(data) {
            var ql = `delete from test.meeting where mid=${data.mid}`;
            console.log(ql);
            mysqlconnection.query(ql, function(error, myresults, fields) {
                console.log(error)
            });
            var ql = `delete from test.attebd where mid=${data.mid}`;
            mysqlconnection.query(ql, function(error, myresults, fields) {
                console.log(error)
            });

        });
    });








    // 获取需要参加的会议列表  v1.5版本新功能
    // socket 传入uid
    // 返回 attebd 表中 对应uid的全部信息json
    // 客户端收到后 以列表的形式展示出来 点击展开详细信息的弹出框

    io.on('connection', function(socket) {
        socket.on('listmeeting', function(data) {
            var ql = `select * from test.meeting where mid in (select mid from test.attebd where uid='${data.uid}')`
                // console.log(ql);
            mysqlconnection.query(ql, function(error, myresults, fields) {
                if (error != null) {
                    console.log(error);
                }
                var arr = [];

                // console.log(myresults)
                for (var i in myresults) {
                    arr.push(myresults[i])

                }
                // console.log({ listmeet: arr })
                socket.emit('listmeeting_return', { listmeet: arr });
            });

        });
    });







    // 获取 某一会议签到情况
    //  接收 mid  返回信息的json
    io.on('connection', function(socket) {
        socket.on('meetinginfo', function(data) {
            // 接收的mid 签到时间
            // data.mid  data.st
            // 获取attend中 指定mid的全部信息
            var ql = `select * from attebd where mid=${data.mid}`
            mysqlconnection.query(ql, function(error, results, fields) {
                var arr = [];
                //  获取数组
                for (var i in results) {
                    arr.push({
                        uid: results[i].uid,
                        at: results[i].at,
                        diff: null // 迟到时间
                    });
                    console.log(results[i].at);
                }
                // 计算人数
                // arr.length  总人数
                // 已签到人数 count
                var count = 0;
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].at == null) {
                        arr[i].diff = -1 // 表示没有签到
                    } else {
                        count++;
                        var d1 = new Date(data.st);
                        var d2 = new Date(arr[i].at);
                        var minutes = (d2.getTime() - d1.getTime()) / 60000;
                        arr[i].diff = minutes > 0 ? minutes : 0; // 迟到多少分钟
                    }
                }


                info_json = {
                    arr,
                    len: arr.length,
                    count
                }


                socket.emit('meetinginfo_return', info_json);
            });



        });

    });


}
















// 日期
Date.prototype.Format = function(fmt) { //author: meizz 
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}