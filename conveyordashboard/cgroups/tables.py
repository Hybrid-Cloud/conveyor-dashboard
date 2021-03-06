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
from django.utils.translation import pgettext_lazy
from django.utils.translation import ugettext_lazy as _

from horizon import tables

from conveyordashboard.common import actions as common_actions
from conveyordashboard.common import constants as consts


class CreatePlan(common_actions.CreatePlan):
    """"""


class VolumeCGroupsFilterAction(tables.FilterAction):

    def filter(self, table, cgroups, filter_string):
        """Naive case-insensitive search."""
        query = filter_string.lower()
        return [cgroup for cgroup in cgroups
                if query in cgroup.name.lower()]


def get_volume_types(cgroup):
    vtypes_str = ''
    if hasattr(cgroup, 'volume_type_names'):
        vtypes_str = ",".join(cgroup.volume_type_names)
    return vtypes_str


class VolumeCGroupsTable(tables.DataTable):
    STATUS_CHOICES = (
        ("in-use", True),
        ("available", True),
        ("creating", None),
        ("error", False),
    )
    STATUS_DISPLAY_CHOICES = (
        ("available",
         pgettext_lazy("Current status of Consistency Group", u"Available")),
        ("in-use",
         pgettext_lazy("Current status of Consistency Group", u"In-use")),
        ("error",
         pgettext_lazy("Current status of Consistency Group", u"Error")),
    )

    name = tables.Column("name",
                         verbose_name=_("Name"),
                         link="horizon:project:volumes:cgroups:detail")
    description = tables.Column("description",
                                verbose_name=_("Description"),
                                truncate=40)
    status = tables.Column("status",
                           verbose_name=_("Status"),
                           status=True,
                           status_choices=STATUS_CHOICES,
                           display_choices=STATUS_DISPLAY_CHOICES)
    availability_zone = tables.Column("availability_zone",
                                      verbose_name=_("Availability Zone"))
    volume_type = tables.Column(get_volume_types,
                                verbose_name=_("Volume Type(s)"))

    def get_object_id(self, cgroup):
        return cgroup.id

    class Meta(object):
        name = "volume_cgroups"
        verbose_name = _("Volume Consistency Groups")
        css_classes = "table-res %s" % consts.CINDER_CONSISGROUP
        table_actions = (common_actions.CreatePlanWithMultiRes,)
        row_actions = (CreatePlan,)
