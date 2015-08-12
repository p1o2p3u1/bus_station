// the websocket object
var socket = null;
// check if the websocket is already open
var isopen = false;
// the path prefix of the repository, such as /home/svn_repo
var path = "";
// check if the sidebar tree has initialized. If so, we can display coverage now.
var file_tree_init = false;
// the test server ip
var server_ip = "";
// the websocket port number
var server_port = "";
// the svn file handler port, you should know that when you have deployed this project.
var file_server_port = "";
// decide if we should display svn diff coverage
var show_diff = false;
// get diff info and store the data here
var diff_list = [];
// which file are you going to trace? Make you decision when you click start button.
var selected_files = {};
// cache the directories data
var dir_data = null;
// current selected file
var cur_select_file = "";
// current coverage data;
var pre_coverage_data = null;

function addEvents(){
  $('#btn-connect').on('click', function(){
    var $btn = $(this).button('loading');
    // check if the socket is already connected.
    if(isopen) {
      // then close it first.
      isopen = false;
      if(socket != null){
        socket.close();
        $btn.button('reset');
        $btn.removeClass('btn-success btn-danger').addClass("btn-primary");
        return;
      }
    }
    // get the websocket server ip and port
    server_ip = $('#txt-server-ip').val();
    server_port = $('#txt-server-port').val();
    file_server_port = $('#txt-file-server-port').val();
    // check if they are empty
    if(server_ip == "" || server_port == ""){
      alert("server ip or port should not be empty");
      return;
    }
    // init the web socket, however we can not try-cache the connection error
    // I've googled for a while but doesn't find a solution, damn it!

    socket = new WebSocket("ws://" + server_ip + ":" + server_port);

    socket.binaryType = "arraybuffer";
    socket.onopen = function(event){
      isopen = true;
      $btn.button('complete');
      $btn.removeClass("btn-primary btn-danger").addClass("btn-success");
    }

    socket.onerror = function(event){
      isopen = false;
      socket = null;
      $btn.button('error');
      $btn.removeClass("btn-primary btn-success").addClass("btn-danger");
    }

    socket.onclose = function(event){
      isopen = false;
      socket = null;
      $btn.button('reset');
      $btn.removeClass('btn-success btn-danger').addClass("btn-primary");
    }

    socket.onmessage = function(e){
      var selected_file = $('#source').attr('value');
      var obj = JSON.parse(e.data);
      show_coverage(obj);
      if(selected_file && selected_file != ""){
        var full_file_path = path + selected_file;
        var cov = obj[full_file_path];
        if(cov){
          // check if we only need to show diff result
          if(show_diff){
            var exec1 = cov['executed'];
            var exec = $(exec1).filter(diff_list);
            var missing = $(diff_list).not(exec);
            var file_cov = cov['coverage'];
            $.each(exec, function(i){
              $('.number' + exec[i]).removeClass('mis').addClass('run');
            });
            $.each(missing, function(i){
              $('.number' + missing[i]).removeClass('run').addClass('mis');
            });
            if(diff_list.length == 0){
              $('#diff-cov').text('100%');
            } else {
              $('#diff-cov').text((parseFloat(exec.length / diff_list.length) * 100).toFixed(2) + "%");
            }
            $('#source-cov').text((parseFloat(file_cov) * 100).toFixed(2) + "%");
          } else {
            // not show diff result
            var execd = cov['executed'];
            var missing = cov['missed'];
            var coverage = cov['coverage'];
            if(cur_select_file == selected_file){
              // display coverage result with increment
              if(!pre_coverage_data){
                pre_coverage_data = cov;
                colorful_coverage(execd, missing);
              } else {
                var old_exec = pre_coverage_data['executed'];
                var increment = $(execd).not(old_exec);
                colorful_coverage(increment, []);
                pre_coverage_data = cov;
              }
            } else {
              // first time to display, so display them all 
              cur_select_file = selected_file;
              pre_coverage_data = cov;
              colorful_coverage(execd, missing);
            }
            $('#source-cov').text((parseFloat(coverage) * 100).toFixed(2) + "%");
          }
        } else {
          $('#source-cov').text(0);
        }
      }
    }

    // list directories
    if(file_tree_init){
      $('#file-selector-modal').modal('show');
    } else {
      $.ajax({
        url: "http://" + server_ip + ":" + file_server_port + "/list",
        jsonp: 'callback',
        dataType: "jsonp",
        success: function(response){
          dir_data = response;
          path = response['path'];
          var dirs = response['dirs'];
          var html = "";
          for(var i=0; i<dirs.length; i++){
            var files = response[dirs[i]];
            html += build_modal_file_tree(dirs[i], files);
          }
          var files = response['files'];
          html += build_modal_file_tree(null, files);
          $('#file-selector').html(html);
          $('#file-selector').treegrid().treegrid('collapseAll');
          $('#file-selector-modal').modal('show');
          $('.select-this').on('click', function(){
            var is_checked = $(this).is(':checked');
            var node = $(this).parent().parent();
            if(node.treegrid('isNode') == false){
              // some files out of the root directory
              change_select_state(node, [node], is_checked, false);
            } else {
              if(node.treegrid('getParentNode') == null){
                // this is already the parent node and it is is_checked, 
                // so all the childs node should also be is_checked.
                var childs = node.treegrid('getChildNodes');
                change_select_state(node, childs, is_checked, true);
              } else {
                // we only need to change this node
                var parent = node.treegrid('getParentNode');
                change_select_state(parent, [node], is_checked, false);
              }
            }
          });
        }
      });
      file_tree_init = true;
    }
  });
  
  $('#chk-show-diff').on('click', function(){
    show_diff = $(this).is(':checked');
    if(show_diff){
      // remove the original coverage info
      $('#source .line').removeClass('mis').removeClass('run');
      var filename = $('#source').attr('value');
      if(!filename || filename == "") return;
      filename = encodeURIComponent(filename);
      var cur_version = $("#source-revision").text();
      var old_version = $("#txt-diff-version").val();
      if(!old_version || old_version > cur_version){
        alert("diff版本要小于当前文件版本");
        return;
      }
      // get diff info
      $.ajax({
        url: "http://" + server_ip + ":" + file_server_port + "/diff?path=" + filename + '&old=' + old_version + '&cur=' + cur_version,
        jsonp: 'callback',
        dataType: "jsonp",
        success: function(data){
          diff_list = data['update'];
        }
      });
      // then waiting for the socket.onmessage call to display coverage result for diff
    }
  });

  $('#show-file-selector-modal').on('click', function(){
    if(file_tree_init){
      $('#file-selector-modal').modal('show');
    }
  });

  $('#btn-trace-start').on('click', function(){
    var checked_boxes = $('.modal-body input:checkbox:checked');
    var files = []
    for(var i=0; i<checked_boxes.length; i++){
      var parent = $(checked_boxes[i]).parent().parent();
      var file_name = parent.find('td[class="file-path"]').text();
      selected_files[file_name] = true;
      files.push(path + file_name);
    }
    sendMessage(JSON.stringify({
      "op": "files",
      "files": files
    }));
    var unchecked_boxed = $('.modal-body input:checkbox:not(:checked)');
    for(var i=0; i<unchecked_boxed.length; i++){
      var parent = $(unchecked_boxed[i]).parent().parent();
      var file_name = parent.find('td[class="file-path"]').text();
      selected_files[file_name] = false;
    }
    process_list_dir();
  });

  $('#btn-save-report').on('click', function(){
    // collect the data and send post to api
  });
  
  
  // funny
  $("#menu-toggle").click(function(e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
  });

  $('[data-toggle="tooltip"]').tooltip();

}

// disable toolbar and double click edit, we don't need it.
SyntaxHighlighter.defaults['toolbar'] = false;
SyntaxHighlighter.defaults['quick-code'] = false;
SyntaxHighlighter.all();
addEvents();

function colorful_coverage(executed, missing){
  // show coverage result in real time for each on message call
  $.each(executed, function(i){
    $('.number' + executed[i]).removeClass('mis').addClass('run');
  });
  $.each(missing, function(i){
    $('.number' + missing[i]).removeClass('run').addClass('mis');
  });
}

// build the left sidebar 
function build_file_tree(parent, childs){
  // first build sub directories, calculate total lines and then build parent folder.
  // childs are list of tuples [(filename1, lines_no), (filename2, lines_no)...]
  var total_code_lines = 0;
  var html = "";
  var childs_num = 0;
  for(var i=0; i<childs.length; i++){
    if(!selected_files[childs[i][0]]) continue;
    childs_num += 1;
    var class_value = "treegrid-" + childs[i][0];
    total_code_lines += childs[i][1];
    if(parent){
      class_value += " treegrid-parent-" + parent;
    }
    html += '<tr class="' + class_value +'">'
    html += '<td class="file-path"><span class="file_source" value="' + childs[i][0] + '">' + childs[i][0] + '</span></td>';
    html += '<td class="code-lines">' + childs[i][1] + '</td>'
    html += '<td class="run-lines">0</td>'
    if(parent){
      html += '<td class="file-cov parent-' + parent +' coverage_' + childs[i][0].replace(/[\./]/g, '_') + '" value="0">0%</td></tr>';
    } else {
      html += '<td class="file-cov coverage_' + childs[i][0].replace(/[\./]/g, '_') + '" value="0">0%</td></tr>';
    }
  }
  var parent_html = "";
  if(parent != null && childs_num > 0){
    parent_html += '<tr class="treegrid-' + parent +'">';
    parent_html += '<td class="file-path">' + parent + '</td>';
    parent_html += '<td class="total-code-lines">' + total_code_lines + '</td>';
    parent_html += '<td class="total-run-lines">0</td>';
    parent_html += '<td class="file-cov">0%</td></tr>';
  }
  return parent_html + html;
}

// process list directories response from jsonp
function process_list_dir(){
  var dirs = dir_data['dirs'];
  var html = "";
  for(var i = 0; i<dirs.length; i++){
    var files = dir_data[dirs[i]];
    html += build_file_tree(dirs[i], files);
  }
  var files = dir_data['files'];
  html += build_file_tree(null, files);
  $('.tree').html(html);
  $('.tree').treegrid().treegrid('collapseAll');
  file_tree_init = true;
  $('.file_source').on('click', function(){
    // add click event for each file, then get the source text for it
    var file_path = $(this).attr('value');
    if(cur_select_file == ""){
      cur_select_file = file_path;
    }
    file_path = encodeURIComponent(file_path);
    $.ajax({
      url: 'http://' + server_ip + ':' + file_server_port + '/file?path=' + file_path,
      jsonp: 'callback',
      dataType: 'jsonp',
      jsonpCallback: 'process_file_source'
    });
  });
}

// process the source text from jsonp
function process_file_source(response){
  var filename = response['filename'];
  filename = filename.replace(/\\/g, '/');
  var source = response['text'];
  var revision = response['Revision'];
  $('#source').attr('value', filename);
  $('#source').html('<pre class="brush:python;">' + source + '</pre>');
  $('#source-name').text(filename);
  $('#source-revision').text(revision);
  $('#txt-diff-version').text('');
  $('#diff-cov').text('');
  $('#chk-show-diff').prop('checked', false);
  SyntaxHighlighter.highlight();
}

function show_coverage(data){
  if(data && file_tree_init){
    // display coverage data for each file
    $.each(data, function(key, value){
      var file = key.replace(path, '').replace(/[\./]/g, '_');
      var cov = (value.coverage * 100).toFixed(2);
      var run_lines = value.executed.length
      $('.coverage_' + file).attr('value', cov).text(cov + "%");
      $('.coverage_' + file).parent().children('td[class="run-lines"]').attr('value', run_lines).text(run_lines);
    });
    // display coverage data for each folder
    var rootNodes = $('.tree').treegrid('getRootNodes');
    $.each(rootNodes, function(i){
      var className = rootNodes[i].classList[0];
      var parent_id = $('.tree .' + className).treegrid('getNodeId');
      var childs = $('.tree .treegrid-parent-' + parent_id);
      var total_run_lines = 0;
      $.each(childs, function(){
        total_run_lines += parseInt($(this).children('td[class="run-lines"]').text());
      });
      //console.log(total_code_lines);
      $('.tree .treegrid-' + parent_id).children('td[class="total-run-lines"]').text(total_run_lines);
      var total_code_lines = parseInt($('.tree .treegrid-' + parent_id).children('td[class="total-code-lines"]').text());
      var avg_cov_parent = 0;
      if(childs.length > 0 && total_code_lines > 0){
        avg_cov_parent = (total_run_lines * 100.0 / total_code_lines).toFixed(2);
      }
      $('.tree .treegrid-' + parent_id).children('td[class="file-cov"]').text(avg_cov_parent + "%");
    });
  }
}


function sendMessage(message){
  if(isopen && socket != null){
    socket.send(message);
  }
}



function change_select_state(parent, childs, state, change_all){
  if(state == true){
    for(var i=0; i<childs.length; i++){
      $(childs[i]).css('background-color', '#ddffdd');
      $(childs[i]).find('input').prop('checked', true);
    }
    if(change_all){
      parent.css('background-color', '#ddffdd');
      parent.find('input').prop('checked', true);
    }
  } else {
    for(var i=0; i<childs.length; i++){
      $(childs[i]).css('background-color', '');
      $(childs[i]).find('input').prop('checked', false);
    }
    parent.css('background-color', '');
    parent.find('input').prop('checked', false);
  }
}

function build_modal_file_tree(parent, childs){
  var html = "";
  if(parent){
    html += '<tr class="treegrid-' + parent +'">';
    html += '<td class="file-path">' + parent + '</td>';
    html += '<td class="is-select"><input type="checkbox" class="select-this"></td></tr>'
  }
  for(var i=0; i<childs.length; i++){
    var class_value = "treegrid-" + childs[i][0];
    if(parent){
      class_value += " treegrid-parent-" + parent;
    }
    html += '<tr class="' + class_value +'">'
    html += '<td class="file-path">' + childs[i][0] + '</td>';
    html += '<td class="is-select"><input type="checkbox" class="select-this"></td></tr>'
  }
  return html;
}


