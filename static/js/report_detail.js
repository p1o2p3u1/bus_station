SyntaxHighlighter.defaults['toolbar'] = false;
SyntaxHighlighter.defaults['quick-code'] = false;
SyntaxHighlighter.all();

$('.view-source').click(function(e){
  e.preventDefault();
  var id = $(this).parent().parent().children('td').first().text();
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
});