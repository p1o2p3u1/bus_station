SyntaxHighlighter.defaults['toolbar'] = false;
SyntaxHighlighter.defaults['quick-code'] = false;
SyntaxHighlighter.all();

var display = false;

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