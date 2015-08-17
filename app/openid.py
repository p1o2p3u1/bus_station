#! /usr/bin/env python
# -*- coding: utf-8 -*-

import urllib
import urllib2


def redirect_url(root_url, next_url):
    associate_data = {
        'openid.mode': 'associate',
        'openid.assoc_type': 'HMAC-SHA256',
        'openid.session_type': 'no-encryption',
    }

    associate_data = urllib.urlencode(associate_data)
    assoc_dict = {}

    assoc_resp = urllib2.urlopen('https://login.netease.com/openid/', associate_data)

    for line in assoc_resp.readlines():
        line = line.strip()
        if not line:
            continue
        k, v = line.split(":")
        assoc_dict[k] = v

    redirect_data = {
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.assoc_handle': assoc_dict['assoc_handle'],
        'openid.return_to': root_url + 'login_callback?' + urllib.urlencode({'next': next_url}),
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.realm': root_url,
        'openid.ns.sreg': 'http://openid.net/extensions/sreg/1.1',
        'openid.sreg.required': "nickname,email,fullname",
    }
    redirect_data = urllib.urlencode(redirect_data)

    return "https://login.netease.com/openid/?" + redirect_data, assoc_dict['mac_key']


def check_authentication(request, idp="https://login.netease.com/openid/"):
    ''' check_authentication communication: FIXME(ssx) not used '''
    check_auth = {}
    is_valid_map = {
        'false': False,
        'true': True,
    }

    request.update({'openid.mode': 'check_authentication'})
    for k, v in request.iteritems():
        if type(v) is unicode:
            request.update({k: v.encode('utf-8')})

    authentication_data = urllib.urlencode(request)
    auth_resp = urllib2.urlopen(idp, authentication_data)

    for line in auth_resp.readlines():
        line = line.strip()
        if not line:
            continue
        k, v = line.split(":", 1)
        check_auth[k] = v

    is_valid = check_auth.get('is_valid', 'false')
    return is_valid_map[is_vaid]
