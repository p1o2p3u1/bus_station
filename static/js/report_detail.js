SyntaxHighlighter.defaults['toolbar'] = false;
SyntaxHighlighter.defaults['quick-code'] = false;
SyntaxHighlighter.all();

var display = false;
$('#table-report-detail').DataTable({
  'fnFooterCallback': function(foot, data, start, end, display){
    var total_line = 0;
    var total_exec = 0;
    var total_miss = 0;
    for(var i = start; i<end; i++){
      total_line += parseInt(data[i][3]);
      total_exec += parseInt(data[i][4]);
      total_miss += parseInt(data[i][5]);
    }
    var html = "<tr><td>合计</td><td></td><td></td><td>" + total_line + "</td><td>" + total_exec + "</td><td>" + total_miss + "</td><td>" + (total_exec * 100 / total_line).toFixed(2) + "%</td></tr>"
    $('.dataTable tfoot').html(html);
  }
});

$('.view-source').click(function(e){
  e.preventDefault();
  var id = $(this).parent().parent().children('td').first().text();
  var filename = $(this).parent().parent().children('td').eq(1).text();
  var pre_file = $('#source').attr('filename');
  if(!pre_file || filename != pre_file){
    $('#source').attr('filename', filename);
    // do ajax and get source
    $.ajax({
      url: "report_cov?id=" + id,
      success: function(data){
        var source = data['source'];
        $('#source').html('<pre class="brush:python;">' + source + '</pre>');
        SyntaxHighlighter.highlight();
        var exec = data['exec'];
        var miss = data['miss'];
        $.each(exec, function(i){
          $('.number' + exec[i]).addClass('run');
        });
        $.each(miss, function(i){
          $('.number' + miss[i]).addClass('mis');
        });
      }
    });
    $('#source').show();
    display = false;
  } else {
    if(display){
      $('#source').show();
    } else {
      $('#source').hide();
    }
    display = !display;
  }

});

