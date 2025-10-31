var lastScrollTop = 0;

$(window).scroll(function() {
  var st = $(this).scrollTop();

  if (st > lastScrollTop) {
    // Runterscrollen → Navigation ausblenden
    if (!$('nav.header').hasClass('down')) {
      $('nav.header').addClass('down');
    }
  } else {
    // Hochscrollen → Navigation einblenden
    $('nav.header').removeClass('down');
  }

  lastScrollTop = st;

  // Wenn Seite ganz oben → immer eingeblendet
  if (st <= 0) {
    $('nav.header').removeClass('down');
  }
});