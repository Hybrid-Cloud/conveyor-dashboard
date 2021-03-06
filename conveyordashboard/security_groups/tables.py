# Copyright (c) 2017 Huawei, Inc.
#
#    Licensed under the Apache License, Version 2.0 (the "License"); you may
#    not use this file except in compliance with the License. You may obtain
#    a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#    License for the specific language governing permissions and limitations
#    under the License.

import six

from django.conf import settings
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext_lazy as _

from horizon import tables
from horizon.utils import filters

from conveyordashboard.common import actions as common_actions
from conveyordashboard.common import constants as consts


class CreatePlan(common_actions.CreatePlan):
    """"""


class SecurityGroupsTable(tables.DataTable):
    name = tables.Column("name", verbose_name=_("Name"))
    description = tables.Column("description", verbose_name=_("Description"))

    class Meta(object):
        name = 'security_groups'
        verbose_name = _("Security Groups")
        css_classes = "table-res %s" % consts.NEUTRON_SECGROUP
        table_actions = (common_actions.CreatePlanWithMultiRes,)
        row_actions = (CreatePlan,)


def filter_direction(direction):
    if direction is None or direction.lower() == 'ingress':
        return _('Ingress')
    else:
        return _('Egress')


def filter_protocol(protocol):
    if protocol is None:
        return _('Any')
    return six.text_type.upper(protocol)


def get_remote_ip_prefix(rule):
    if 'cidr' in rule.ip_range:
        if rule.ip_range['cidr'] is None:
            range = '::/0' if rule.ethertype == 'IPv6' else '0.0.0.0/0'
        else:
            range = rule.ip_range['cidr']
        return range
    else:
        return None


def get_port_range(rule):
    # There is no case where from_port is None and to_port has a value,
    # so it is enough to check only from_port.
    if rule.from_port is None:
        return _('Any')
    ip_proto = rule.ip_protocol
    if rule.from_port == rule.to_port:
        return check_rule_template(rule.from_port, ip_proto)
    else:
        return (u"%(from)s - %(to)s" %
                {'from': check_rule_template(rule.from_port, ip_proto),
                 'to': check_rule_template(rule.to_port, ip_proto)})


def check_rule_template(port, ip_proto):
    rules_dict = getattr(settings, 'SECURITY_GROUP_RULES', {})
    if not rules_dict:
        return port
    templ_rule = [rule for rule in rules_dict.values()
                  if (str(port) == rule['from_port']
                      and str(port) == rule['to_port']
                      and ip_proto == rule['ip_protocol'])]
    if templ_rule:
        return u"%(from_port)s (%(name)s)" % templ_rule[0]
    return port


def get_remote_security_group(rule):
    return rule.group.get('name')


class CreateRule(tables.LinkAction):
    name = 'add_rule'
    verbose_name = _("Add Rule")
    classes = ("btn-add-rule",)
    icon = 'plus'
    url = "javascript:void(0);"

    def get_link_url(self, datum):
        return reverse('horizon:conveyor:plans:add_rule',
                       args=(self.table.kwargs['secgroup_id'],))


class DeleteRule(tables.LinkAction):
    name = 'delete_rule'
    verbose_name = _("Delete Rule")
    classes = ("btn-delete-rule", "disabled",)
    icon = 'remove'
    url = "javascript:void(0);"


class RulesTable(tables.DataTable):
    direction = tables.Column('direction',
                              verbose_name=_("Direction"),
                              filters=(filter_direction,))
    ethertype = tables.Column('ethertype',
                              verbose_name=_("Ether Type"))
    protocol = tables.Column('ip_protocol',
                             verbose_name=_("IP Protocol"),
                             filters=(filter_protocol,))
    port_range = tables.Column(get_port_range,
                               verbose_name=_("Port Range"))
    remote_ip_prefix = tables.Column(get_remote_ip_prefix,
                                     verbose_name=_("Remote IP Prefix"))
    remote_security_group = tables.Column(get_remote_security_group,
                                          verbose_name=_("Remote Security"
                                                         " Group"))

    def sanitize_id(self, obj_id):
        return filters.get_int_or_uuid(obj_id)

    def get_object_display(self, rule):
        return six.text_type(rule)

    class Meta(object):
        name = 'rules'
        verbose_name = _("Security Group Rules")
        footer = False
        table_actions = (CreateRule, DeleteRule,)
